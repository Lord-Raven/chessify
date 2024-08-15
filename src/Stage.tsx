import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import {Game, move, moves, aiMove, getFen} from 'js-chess-engine';

type MessageStateType = any;

type ConfigType = any;

type InitStateType = any;

type ChatStateType = any;

const MOVE_REGEX = /([a-hA-H][1-8])/gm

const PIECE_MAPPING: {[key: string]: string} = {
    "K": '\u2654',
    "Q": '\u2655',
    "R": '\u2656',
    "B": '\u2657',
    "N": '\u2658',
    "P": '\u2659',
    "k": '\u265A',
    "q": '\u265B',
    "r": '\u265C',
    "b": '\u265D',
    "n": '\u265E',
    "p": '\u265F'
}
export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

    gameState: any;

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
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {

        if (!this.gameState) {
            this.gameState = new Game().exportJson();
            console.log(this.gameState);
        }
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
            content,
            anonymizedId,
            isBot
        } = userMessage;

        // Check for player's move.
        let matches = MOVE_REGEX.exec(content);
        console.log(matches);
        console.log(matches ? matches["0"] : '');
        let aiNote = '';
        let visualState = this.buildBoard();

        if (matches) {
            let coordinates: {[key: string]: string} = {};
            const possibleMoves = moves(this.gameState);
            if (matches["1"]) {
                coordinates["start"] = matches["0"].toUpperCase();
                coordinates["end"] = matches["1"].toUpperCase();
                if (!possibleMoves[coordinates["start"]] || !possibleMoves[coordinates["start"]].includes(coordinates["end"])) {
                    aiNote = `{{user}} tried to specify an invalid move. {{char}} may choose to tease or taunt them, but it remains {{user}}'s turn.`;
                }
            } else {
                coordinates["end"] = matches["0"].toUpperCase();
                let possibleStarts = Object.keys(possibleMoves).filter(key => moves[key].includes(coordinates["end"]));
                if (possibleStarts.length == 1) {
                    coordinates["start"] = possibleStarts[0];
                } else if (possibleStarts.length > 1) {
                    aiNote = `{{user}} tried to specify only an ending position, but multiple pieces could make that move. {{char}} may choose to tease or taunt them, but it remains {{user}}'s turn.`;
                } else {
                    aiNote = `{{user}} tried to specify an ending position that no piece can move to. {{char}} may choose to tease or taunt them, but it remains {{user}}'s turn.`;
                }
            }

            if (aiNote == '') {
                // Must be a valid move; make it so.
                this.gameState = move(this.gameState, coordinates["start"], coordinates["end"]);
                visualState = this.buildBoard();
                // TODO: A big flaw of both turns occurring here is that the AI never sees the intermediate FEN and has limited insight into what the user's move accomplished; consider attempting to summarize for them.

                // Then, make a move:
                const charMove = aiMove(this.gameState, 2);
                console.log(charMove);
                console.log(Object.keys(charMove)[0]);
                console.log(charMove[Object.keys(charMove)[0]]);
                this.gameState = move(this.gameState, Object.keys(charMove)[0], charMove[Object.keys(charMove)[0]]);

                aiNote = `{{user}} moved from ${coordinates["start"]} to ${coordinates["end"]}. {{char}} followed up by moving from ${Object.keys(charMove)[0]} to ${charMove[Object.keys(charMove)[0]]}.`
            }
        } else {
            aiNote = `{{user}} didn't make a move this turn. {{char}} should spend some time chatting, bantering, or antagonizing them, but it will remain {{user}}'s turn.`;
        }

        return {
            stageDirections: `[{{char}} and {{user}} are playing chess. ${aiNote}\nMake remarks based on the FEN of the current board:\n${getFen(this.gameState)}]`,
            messageState: null,
            modifiedMessage: null,
            systemMessage: visualState,
            error: null,
            chatState: null,
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {

        const {
            content,
            anonymizedId,
            isBot
        } = botMessage;

        return {
            stageDirections: null,
            messageState: null,
            modifiedMessage: null,
            error: null,
            systemMessage: this.buildBoard(),
            chatState: null
        };
    }

    buildBoard(): string {
        let fen: string = getFen(this.gameState);
        fen = fen.substring(0, fen.indexOf(' '));
        let result = `---\n<span style='font-family: monospace; color: darkseagreen;'>`;
        for(let index = 0; index < fen.length; index++) {
            const charAt = fen.charAt(index);

            switch (true) {
                case /[bknpqrBKNPQR]/.test(charAt):
                    result += ` ${PIECE_MAPPING[charAt]}`;
                    break;
                case /\d/.test(charAt):
                    for (let i = 0; i < Number(charAt); i++) {
                        result += ` .`;
                    }
                    break;
                case '/' == (charAt):
                    result += `</span>\n<span style='font-family: monospace; color: darkseagreen;'>`;
                    break;
                default:
                    break;
            }
        }

        return `${result}</span>`;
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
