// generate a parse table given an input grammar
// simple LR(0) parser right now

class ProductionRule {
    constructor(nonterminal, terms) {
        this.nonterminal = nonterminal;
        this.terms = terms;
    }
};

class LRItem {
    constructor(rule, index) {
        this.rule = rule;
        this.index = index;
    }

    equals(other) {
        return this.rule == other.rule && this.index == other.index;
    }
};

class TransitiveClosure {
    constructor(root) {
        this.root = root;
        this.items = [];
        this.closures = {};
    }
};

// rules should be a list of ProductionRule objects
function generateTable(rules) {
    let finalStates = [];

    // build the closures
    let closures = [];

    let s0 = new TransitiveClosure(null);
    for (let i = 0; i < rules.length; i++) {
        let item = new LRItem(i, 0);
        s0.items.push(item);
    }
    closures.push(s0);

    let searchClosure = 0;
    while (searchClosure < closures.length) {
        let closure = closures[searchClosure];
        let state = new ParserState();

        for (const item of closure.items) {
            const rule = rules[item.rule];
            if (item.index >= rule.terms.length) {
                // this is a final item, signal a reduce
            }
            else {
                // this isn't the final item, find or generate its closure

                // try to find an existing closure that fits this item
                let foundClosure = -1;
                for (let j = 0; j < closures.length; j++) {
                    if (closures[j].root != null && closures[j].root.equals(item)) {
                        foundClosure = j;
                        break;
                    }
                }

                if (foundClosure == -1) {
                    // no preexisting closure found, create a new one
                    foundClosure = closures.length;
                    let newClosure = new TransitiveClosure(item);
                    let lookaheadIndex = item.index + 1;
                    newClosure.items.push(new LRItem(item.rule, lookaheadIndex));
                    
                    if (lookaheadIndex < rule.terms.length) {
                        const lookaheadItem = rule.terms[lookaheadIndex];
                        
                        // create the rest of the items in this closure
                        for (let i = 0; i < rules.length; i++) {
                            if (rules[i].nonterminal == lookaheadItem) {
                                newClosure.items.push(new LRItem(i, 0));
                            }
                        }
                    }
                    closures.push(newClosure);
                }

                closure.closures[rule.nonterminal] = foundClosure;
            }
        }
    }
    
}