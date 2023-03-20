
// basic token splitter
function splitTokens(table, text) {
    const terminals = table.terminals;

    let tokens = [];
    
    let buf = "";
    for (let c = 0; c < text.length; c++) {
        let char = text.charAt(c);

        // skip whitespace
        if (char == '\t' || char == '\r' || char == '\n' || char == " ")
            continue;
        
        buf += char;

        if (buf == "id"
            || buf == "+"
            || buf == "*"
            || buf == "("
            || buf == ")"
            || buf == "$") {
            tokens.push(buf);
            buf = "";
        }
    }

    if (buf.length != 0)
        throw new Error(`splitTokens: unrecognized token '${buf}'`);
    
    return tokens;
}