export function translateSan(fen: string, san: string, isWhite: boolean): string[]  {
    let x = '';
    let y = '';


    // Stole some code to potentially translate. Probably not gonna bother.
/*

    if (san.toLowerCase() == "Z0") {
        return [x, y];
    }
    // Consider stripping whitespace? Could have been done up front by capture regex.
    // san = normalizeSan(san);

    san = san.substring(0, san.indexOf("="));
    let lastChar = san.charAt(san.length - 1);

    if (san in ["O-O","O-O-O"]) { // is castle
        if (san == "O-O") {
            return board.getContext().getoo(side);
        } else {
            return board.getContext().getooo(side);
        }
    }

    if (san.length() == 3 &&
        Character.isUpperCase(san.charAt(2))) {
        strPromotion = san.substring(2, 3);
        san = san.substring(0, 2);
    }

    Square from = Square.NONE;
    Square to;
    try {
        to = Square.valueOf(StringUtil.lastSequence(san.toUpperCase(), 2));
    } catch (Exception e) {
        throw new MoveConversionException("Couldn't parse destination square[" + san + "]: " +
            san.toUpperCase());
    }
    Piece promotion = StringUtils.isEmpty(strPromotion) ? Piece.NONE :
        Piece.fromFenSymbol(side.equals(Side.WHITE) ? strPromotion.toUpperCase() : strPromotion.toLowerCase());

    if (san.length() == 2) { //is pawn move
        long mask = Bitboard.getBbtable(to) - 1L;
        long xfrom = (side.equals(Side.WHITE) ? mask : ~mask) & Bitboard.getFilebb(to) &
            board.getBitboard(Piece.make(side, PieceType.PAWN));
        int f = side.equals(Side.BLACK) ? Bitboard.bitScanForward(xfrom) :
            Bitboard.bitScanReverse(xfrom);
        if (f >= 0 && f <= 63) {
            from = Square.squareAt(f);
        }
    } else {

        String strFrom = (san.contains("x") ?
            StringUtil.beforeSequence(san, "x") :
            san.substring(0, san.length() - 2));

        if (strFrom == null ||
            strFrom.length() == 0 || strFrom.length() > 3) {
            throw new MoveConversionException("Couldn't parse 'from' square " + san + ": Too many/few characters.");
        }

        PieceType fromPiece = PieceType.PAWN;

        if (Character.isUpperCase(strFrom.charAt(0))) {
            fromPiece = PieceType.fromSanSymbol(String.valueOf(strFrom.charAt(0)));
        }

        if (strFrom.length() == 3) {
            from = Square.valueOf(strFrom.substring(1, 3).toUpperCase());
        } else {
            String location = StringUtils.EMPTY;
            if (strFrom.length() == 2) {
                if (Character.isUpperCase(strFrom.charAt(0))) {
                    location = strFrom.substring(1, 2);
                } else {
                    location = strFrom.substring(0, 2);
                    from = Square.valueOf(location.toUpperCase());
                }
            } else {
                if (Character.isLowerCase(strFrom.charAt(0))) {
                    location = strFrom;
                }
            }
            if (location.length() < 2) {
                //resolving ambiguous from
                long xfrom = board.squareAttackedByPieceType(to,
                    board.getSideToMove(), fromPiece);
                if (location.length() > 0) {
                    if (Character.isDigit(location.charAt(0))) {
                        int irank = Integer.parseInt(location);
                        if (!(irank >= 1 && irank <= 8)) {
                            throw new MoveConversionException("Couldn't parse rank: " + location);
                        }
                        Rank rank = Rank.allRanks[irank - 1];
                        xfrom &= Bitboard.getRankbb(rank);
                    } else {
                        try {
                            File file = File.valueOf("FILE_" + location.toUpperCase());
                            xfrom &= Bitboard.getFilebb(file);
                        } catch (Exception e) {
                            throw new MoveConversionException("Couldn't parse file: " + location);
                        }
                    }
                }
                if (xfrom != 0L) {
                    if (!Bitboard.hasOnly1Bit(xfrom)) {
                        xfrom = findLegalSquares(board, to, promotion, xfrom);
                    }
                    int f = Bitboard.bitScanForward(xfrom);
                    if (f >= 0 && f <= 63) {
                        from = Square.squareAt(f);
                    }
                }
            }
        }

    }
    if (from.equals(Square.NONE)) {
        throw new MoveConversionException("Couldn't parse 'from' square " + san + " to setup: " + board.getFen());
    }
    return new Move(from, to, promotion);

*/
    return [x, y];
}