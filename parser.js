
// encapsulate the current state of the parse operation
class ParseContext {
    constructor(table) {
        this.table = table;
    }
}

let context = null;

function initParseTable(ptable) {
    context = new ParseContext(ptable);
    displayParseTable(table);
}

function displayParseTable(table) {
    let tableDiv = $(".table");
    
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