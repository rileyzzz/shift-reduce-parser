
class ParserState {
    constructor(actions, goto) {
        // dictionary mapping symbols to actions
        this.actions = actions;
        // dictionary matching rules to states
        this.goto = goto;
    }
}

class ParserTable {
    constructor(states) {
        // list of parser states
        this.states = states;
    }
}
