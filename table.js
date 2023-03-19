
class ParserRule {
    constructor(matches, result) {
        this.matches = matches;
        this.result = result;
    }
}

class ParserState {
    constructor(actions, goto) {
        // dictionary mapping symbols to actions
        this.actions = actions;
        // dictionary matching rules to states
        this.goto = goto;
    }
}

class ParserTable {
    constructor(rules, states) {
        // list of parser rules
        this.rules = rules;
        // list of parser states
        this.states = states;
    }
}
