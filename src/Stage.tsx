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
    "K": `<tspan class='white-piece'>\u265A</tspan>`, //'\u2654',
    "Q": `<tspan class='white-piece'>\u265B</tspan>`, //'\u2655',
    "R": `<tspan class='white-piece'>\u265C</tspan>`, //'\u2656',
    "B": `<tspan class='white-piece'>\u265D</tspan>`, //'\u2657',
    "N": `<tspan class='white-piece'>\u265E</tspan>`, //'\u2658',
    "P": `<tspan class='white-piece'>\u265F</tspan>`, //'\u2659',
    "k": `<tspan class='black-piece'>\u265A</tspan>`,
    "q": `<tspan class='black-piece'>\u265B</tspan>`,
    "r": `<tspan class='black-piece'>\u265C</tspan>`,
    "b": `<tspan class='black-piece'>\u265D</tspan>`,
    "n": `<tspan class='black-piece'>\u265E</tspan>`,
    "p": `<tspan class='black-piece'>\u265F</tspan>`
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

    // Not saved:
    characters: {[key: string]: Character};
    user: User;
    takenBlacks: string = '';
    takenWhites: string = '';


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

                //visualState = this.buildBoard();
                console.log(this.gameState);

                // TODO: A big flaw of both turns occurring here is that the AI never sees the intermediate FEN and has limited insight into what the user's move accomplished; consider attempting to summarize for them.

                // Then, make an AI move:
                const charMove = aiMove(this.gameState, 2);
                aiNote = `${aiNote}\nThen, ${this.describeMove(Object.keys(charMove)[0], charMove[Object.keys(charMove)[0]], "{{char}}", this.gameState)}`;
                this.gameState = move(this.gameState, Object.keys(charMove)[0], charMove[Object.keys(charMove)[0]]);
                console.log(aiNote);

                // Calculate captured pieces:
                this.takenBlacks = 'kqrrbbnnpppppppp';
                this.takenWhites = 'KQRRBBNNPPPPPPPP';
                const pieces: string[] = Object.values(this.gameState.pieces);
                pieces.forEach(piece => {
                    const blackIndex = this.takenBlacks.indexOf(piece);
                    if (blackIndex > -1) {
                        this.takenBlacks = this.takenBlacks.slice(0, blackIndex) + this.takenBlacks.slice(blackIndex + 1);
                    }
                    const whiteIndex = this.takenWhites.indexOf(piece);
                    if (whiteIndex > -1) {
                        this.takenWhites = this.takenWhites.slice(0, whiteIndex) + this.takenWhites.slice(whiteIndex + 1);
                    }
                });
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
            systemMessage: null,
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
            description += `, capturing ${PIECE_NAME_MAPPING[gameState.pieces[end]]}`;
        }
        return `${description}.`;
    }

    addSpace(char: string, coords: string, type: string): string {
        return `<div class='${type}'><svg style='width: 100%; height: 100%;' viewBox='0 0 20 20'><text x='0.2' y='18.6' style='font: italic 3px sans-serif;'>${coords}</text><text x='2' y='16.5'>${char}</text></svg></div>`;
    }

    buildRow(contents: string, rowNum: number): string {
        let result = `<div class='row'>`;
        for(let index = 0; index < contents.length; index++) {
            const charAt = contents.charAt(index);
            const coords = `${String.fromCharCode('A'.charCodeAt(0) + index)}${rowNum + 1}`;

            switch (true) {
                case /[bknpqrBKNPQR]/.test(charAt):
                    result += this.addSpace(`${PIECE_MAPPING[charAt]}`, coords, `space-${(rowNum * 8 + index) % 2}`);
                    break;
                case /\d/.test(charAt):
                    for (let i = 0; i < Number(charAt); i++) {
                        result += this.addSpace(` `, coords, `space-${(rowNum * 8 + index) % 2}`);
                    }
                    break;
                default:
            }
        }
        result += `</div>`;
        return result;
    }

    buildDiscard(): string {
        let result = `<div class='discard'><div class='discard-black'>`;
        for (let index = 0; index < this.takenBlacks.length; index++) {
            result += this.addSpace(`${PIECE_MAPPING[this.takenBlacks.charAt(index)]}`, '', 'discard-space');
        }
        result += `</div><div class='discard-white'>`
        for (let index = 0; index < this.takenWhites.length; index++) {
            result += this.addSpace(`${PIECE_MAPPING[this.takenWhites.charAt(index)]}`, '', 'discard-space');
        }
        result += `</div></div>`;

        return result;
    }

    buildBoard(): string {
        let fen: string = getFen(this.gameState);
        fen = fen.substring(0, fen.indexOf(' '));
        let result = `---\n`;
        let lines = fen.split('/');
        result += `<style>
                    .play-area {width: 80%; padding-bottom: 60%; border: 1px solid #333; border-radius: 5px; position: relative; display: table;}
                    .chessboard {width: 75%; height: 100%; position: absolute; top: 0; left: 0; background: darkslategray}
                        .row{width: 100%; height: 12.5%; display: flex;}
                        div.space-0 {width: 12.5%; height: 100%; display: flex; font-family: monospace; background: slategray; fill: #333;}
                        div.space-1 {width: 12.5%; height: 100%; display: flex; font-family: monospace; background: #333; fill: slategray;}
                        .white-piece{ fill: #fff;} 
                        .black-piece{ fill: #000;}
                    .discard {width: 25%; height: 100%; position: absolute; float: right; top: 0; right: 0;  background: darkslategray}
                        .discard-black{width: 100%; height: 50%; display: flex;}
                        .discard-white{width: 100%; height: 50%; display: flex}
                        .discard-space {width: 25%; display: flex; font-family: monospace;}
                  </style>`;
        result += `<div class='play-area'><div class='chessboard'>`;
        for (let index = 0; index < lines.length; index++) {
            result += this.buildRow(lines[index], index + 1);
        }
        result += `</div>${this.buildDiscard()}</div>`;
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
