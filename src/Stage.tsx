import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import {Game, getFen} from 'js-chess-engine';

type MessageStateType = any;

type ConfigType = any;

type InitStateType = any;

type ChatStateType = any;

const MOVE_REGEX = /[BRQNK][a-h][1-8]|[BRQNK][a-h]x[a-h][1-8]|[BRQNK][a-h][1-8]x[a-h][1-8]|[BRQNK][a-h][1-8][a-h][1-8]|[BRQNK][a-h][a-h][1-8]|[BRQNK]x[a-h][1-8]|[a-h]x[a-h][1-8]=(B+R+Q+N)|[a-h]x[a-h][1-8]|[a-h][1-8]x[a-h][1-8]=(B+R+Q+N)|[a-h][1-8]x[a-h][1-8]|[a-h][1-8][a-h][1-8]=(B+R+Q+N)|[a-h][1-8][a-h][1-8]|[a-h][1-8]=(B+R+Q+N)|[a-h][1-8]|[BRQNK][1-8]x[a-h][1-8]|[BRQNK][1-8][a-h][1-8]/;

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

    game;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {

        super(data);
        const {
            characters,         // @type:  { [key: string]: Character }
            users,                  // @type:  { [key: string]: User}
            config,                                 //  @type:  ConfigType
            messageState,                           //  @type:  MessageStateType
            environment,                     // @type: Environment (which is a string)
            initState,                             // @type: null | InitStateType
            chatState                              // @type: null | ChatStateType
        } = data;
        this.game = new Game();
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {

        return {
            success: true,
            error: null,
            initState: null,
            chatState: null,
        };
    }

    async setState(state: MessageStateType): Promise<void> {

        if (state != null) {
        }
    }

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {

        const {
            content,            /*** @type: string
             @description Just the last message about to be sent. ***/
            anonymizedId,       /*** @type: string
             @description An anonymized ID that is unique to this individual
              in this chat, but NOT their Chub ID. ***/
            isBot             /*** @type: boolean
             @description Whether this is itself from another bot, ex. in a group chat. ***/
        } = userMessage;

        // Check for player's move.
        let matches = MOVE_REGEX.exec(content);
        console.log(matches);
        console.log(matches ? matches["0"] : '');

        this.game.aiMove(1);

        return {
            stageDirections: `[{{char}} and {{user}} are playing chess. {{char}} is black and its their turn. ]`,
            messageState: null,
            modifiedMessage: null,
            systemMessage: `---\`${this.buildBoard()}\``,
            error: null,
            chatState: null,
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {

        const {
            content,            /*** @type: string
             @description The LLM's response. ***/
            anonymizedId,       /*** @type: string
             @description An anonymized ID that is unique to this individual
              in this chat, but NOT their Chub ID. ***/
            isBot             /*** @type: boolean
             @description Whether this is from a bot, conceivably always true. ***/
        } = botMessage;

        this.game.aiMove(1);

        return {
            stageDirections: null,
            messageState: null,
            modifiedMessage: null,
            error: null,
            systemMessage: `---\n#\`${this.buildBoard()}\`#`,
            chatState: null
        };
    }

    buildBoard(): string {
        let fen: string = this.game.exportFEN();
        fen = fen.substring(0, fen.indexOf(' '));
        let result = '';
        for(let index = 0; index < fen.length; index++) {
            const charAt = fen.charAt(index);

            switch (true) {
                case /[bknpqrBKNPQR]/.test(charAt):
                    result += ` ${charAt}`
                    break;
                case /\d/.test(charAt):
                    for (let i = 0; i < Number(charAt); i++) {
                        result += `  `;
                    }
                    break;
                case '/' == (charAt):
                    result += `\n`;
                    break;
                default:
                    break;
            }
        }

        return result;
    }


    render(): ReactElement {

        return <div style={{
            width: '100vw',
            height: '100vh',
            display: 'grid',
            alignItems: 'stretch'
        }}>
        </div>;
    }

}
