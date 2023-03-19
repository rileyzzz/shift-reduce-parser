
// encapsulate the current state of the parse operation
class ParseContext {
    constructor(table) {
        this.table = table;
    }
}

let context = null;

function initParseTable(table) {
    context = new ParseContext(table);
    displayParseTable(table);
}

function displayParseTable(table) {
    let tableDiv = $(".table");
    tableDiv.empty();
    
}

function importJSONTable(json) {
    const states = json["states"];

    let tableStates = [];
    for (let stateIndex = 0; stateIndex < states.length; stateIndex++) {
        const state = states[stateIndex];
        let stateObj = new ParserState(state["actions"], state["goto"]);
        tableStates.push(stateObj);
    }

    return new ParserTable(tableStates);
}