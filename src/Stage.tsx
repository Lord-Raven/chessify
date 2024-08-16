import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message, Character, User} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import {Game, move, moves, aiMove, getFen} from 'js-chess-engine';

type MessageStateType = any;

type ConfigType = any;

type InitStateType = any;

type ChatStateType = any;

const MOVE_REGEX = /([a-hA-H][1-8])/gm

const PIECE_MAPPING: {[key: string]: string} = {
    "K": '<span class="white-piece">\u265A</span>', // \u2654
    "Q": '<span class="white-piece">\u265B</span>', //'\u2655',
    "R": '<span class="white-piece">\u265C</span>', //'\u2656',
    "B": '<span class="white-piece">\u265D</span>', //'\u2657',
    "N": '<span class="white-piece">\u265E</span>', //'\u2658',
    "P": '<span class="white-piece">\u265F</span>', //'\u2659',
    "k": '<span class="black-piece">\u265A</span>',
    "q": '<span class="black-piece">\u265B</span>',
    "r": '<span class="black-piece">\u265C</span>',
    "b": '<span class="black-piece">\u265D</span>',
    "n": '<span class="black-piece">\u265E</span>',
    "p": '<span class="black-piece">\u265F</span>'
}
const PIECE_NAME_MAPPING: {[key: string]: string} = {
    "K": 'the white king',
    "Q": 'the white queen',
    "R": 'a white rook',
    "B": 'a white bishop',
    "N": 'a white knight',
    "P": 'a white pawn',
    "k": 'the black king',
    "q": 'the black queen',
    "r": 'a black rook',
    "b": 'a black bishop',
    "n": 'a black knight',
    "p": 'a black pawn'
}
export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

    gameState: any;

    characters: {[key: string]: Character};
    user: User;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {

        super(data);
        const {
            characters,
            users,
            messageState
        } = data;

        this.characters = characters;
        this.user = users[Object.keys(users)[0]];
        if (messageState != null) {
            this.gameState = JSON.parse(messageState.gameState);
            console.log(this.gameState);
        }
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
            this.gameState = JSON.parse(state.gameState);
            console.log(this.gameState);
        }
    }

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {

        const {
            content,
            promptForId
        } = userMessage;

        // Check for player's move.
        const matches = content.match(MOVE_REGEX);
        console.log(matches);
        console.log(matches ? matches["0"] : '');
        let aiNote = '';
        let visualState = this.buildBoard();

        if (matches && matches.length > 0) {
            let coordinates: {[key: string]: string} = {};
            const possibleMoves = moves(this.gameState);
            if (matches.length > 1) {
                coordinates["start"] = matches[0].toUpperCase();
                coordinates["end"] = matches[1].toUpperCase();
                if (!possibleMoves[coordinates["start"]] || !possibleMoves[coordinates["start"]].includes(coordinates["end"])) {
                    aiNote = `{{user}} tried to specify an invalid move. {{char}} may choose to tease or taunt them, but it remains {{user}}'s turn.`;
                }
            } else {
                coordinates["end"] = matches[0].toUpperCase();
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
                aiNote = `${this.describeMove(coordinates["start"], coordinates["end"], "{{user}}", this.gameState)}`;
                this.gameState = move(this.gameState, coordinates["start"], coordinates["end"]);

                visualState = this.buildBoard();
                console.log(this.gameState);

                // TODO: A big flaw of both turns occurring here is that the AI never sees the intermediate FEN and has limited insight into what the user's move accomplished; consider attempting to summarize for them.

                // Then, make a move:
                const charMove = aiMove(this.gameState, 2);
                aiNote = `${aiNote}\nThen, ${this.describeMove(Object.keys(charMove)[0], charMove[Object.keys(charMove)[0]], "{{char}}", this.gameState)}`;
                this.gameState = move(this.gameState, Object.keys(charMove)[0], charMove[Object.keys(charMove)[0]]);
                console.log(aiNote);
            } else {
                console.log('Player did not input a legal move.');
            }
        } else {
            aiNote = `{{user}} didn't make a move this turn. {{char}} should spend some time chatting, bantering, or antagonizing them, but it will remain {{user}}'s turn.`;
        }

        return {
            stageDirections: this.replaceTags(
                `[{{char}} and {{user}} are playing chess. Write a response describing the most recent move, including {{char}}'s reactions. ${aiNote}\nThis is the only activity that has occurred, so focus on this, making remarks about these moves or the current state of the board. Additional moves will occur in future responses. Here is the board's FEN:\n${getFen(this.gameState)}]`,
                {"user": this.user.name, "char": promptForId ? this.characters[promptForId].name : ''}),
            messageState: {gameState: JSON.stringify(this.gameState)},
            modifiedMessage: null,
            systemMessage: visualState,
            error: null,
            chatState: null,
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {

        return {
            stageDirections: null,
            messageState: {gameState: JSON.stringify(this.gameState)},
            modifiedMessage: null,
            error: null,
            systemMessage: this.buildBoard(),
            chatState: null
        };
    }

    describeMove(start: string, end: string, playerTag: string, gameState: any) {
        let description = `${playerTag} moves ${PIECE_NAME_MAPPING[gameState.pieces[start]]} from ${start} to ${end}`;
        if (gameState.pieces[end]) {
            description += `, capturing ${gameState.pieces[end]}`;
        }
        return `${description}.`;
    }

    addSpace(char: string): string {
        return `<div class='box'>${char}</div>`;
    }

    buildRow(contents: string): string {
        let result = `<div class='row'>`;
        for(let index = 0; index < contents.length; index++) {
            const charAt = contents.charAt(index);

            switch (true) {
                case /[bknpqrBKNPQR]/.test(charAt):
                    result += this.addSpace(`${PIECE_MAPPING[charAt]}`);
                    break;
                case /\d/.test(charAt):
                    for (let i = 0; i < Number(charAt); i++) {
                        result += this.addSpace(` `);
                    }
                    break;
                default:
            }
        }
        result += `</div>`;
        return result;
    }

    buildBoard(): string {
        let fen: string = getFen(this.gameState);
        fen = fen.substring(0, fen.indexOf(' '));
        let result = `---\n`;
        let lines = fen.split('/');
        result += `<style>.chessboard {padding: 6px; width: 100%; height: 0; border: 1px solid #333; border-radius: 5px; display: inline-block; margin: auto; background: darkslategray} div.box {width: 12.5%; height: 12.5%; display: flex; align-items: center; justify-content: center; font-size: 10%; font-family: monospace;}.row{display: flex;} div.row:nth-child(odd) div.box:nth-child(odd){background: slategray;} div.row:nth-child(even) div.box:nth-child(even){background: slategray;} div.row:nth-child(even) div.box:nth-child(odd) {background: #333;} div.row:nth-child(odd) div.box:nth-child(even){background: #333;} .white-piece{ color: #fff;} .black-piece{ color: #000;}</style>`;
        result += `<div class='chessboard'>`;
        lines.forEach(line => result += this.buildRow(line));
        result += `</div>`;
        return `${result}`;
    }

    replaceTags(source: string, replacements: {[name: string]: string}) {
        return source.replace(/{{([A-z]*)}}/g, (match) => {
            return replacements[match.substring(2, match.length - 2).toLowerCase()];
        });
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
