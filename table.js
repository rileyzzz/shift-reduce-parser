
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
        this.actionElements = [];

        // dictionary matching rules to states
        this.goto = goto;
        this.gotoElements = [];
    }
}

class ParserTable {
    constructor(terminals, nonterminals, rules, states) {
        // table headers for terminals/nonterminals
        this.terminals = terminals;
        this.nonterminals = nonterminals;
        // list of parser rules
        this.rules = rules;
        // list of parser states
        this.states = states;

        this.elements = [];
    }
}
