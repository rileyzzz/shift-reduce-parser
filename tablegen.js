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
        this.closures = [];
    }
};

// rules should be a list of ProductionRule objects
function generateTable(rules, all_terminals, all_nonterminals) {
    let finalRules = [];
    for (const srcRule of rules)
        finalRules.push(new ParserRule(srcRule.terms, srcRule.nonterminal));
    
    // create an augmented rule for our root state
    const augRule = new ProductionRule(rules[0].nonterminal + '\'', rules[0].nonterminal);
    all_terminals.add("$");
    rules = [...rules];
    rules.unshift(augRule);
    console.log(`input rules: ${rules}`);

    let finalStates = [];

    // build the closures
    let closures = [];

    let s0 = new TransitiveClosure(null);
    for (let i = 0; i < rules.length; i++) {
        let item = new LRItem(i, 0);
        s0.items.push(item);
    }
    closures.push(s0);
    console.log(`root closure: ${s0}`);

    let searchClosure = 0;
    while (searchClosure < closures.length) {
        let closure = closures[searchClosure++];
        let finalActions = {};
        let finalGoto = {};

        for (const item of closure.items) {
            const rule = rules[item.rule];
            if (item.index >= rule.terms.length) {
                // exception for the augmented rule
                if (item.rule == 0) {
                    finalActions["$"] = "accept";
                }
                else {
                    // this is a final item, signal a reduce across the board using the rule
                    for (const key of all_terminals) {
                        // use the actual index of the rule, not the augmented
                        // however, rules are 1-indexed, so we don't need to worry about subtracting
                        finalActions[key] = "R" + item.rule.toString();
                    }
                }
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

                // create the goto
                let gotoTerm = rule.terms[item.index];
                if (all_nonterminals.has(gotoTerm)) {
                    finalGoto[gotoTerm] = foundClosure;
                }
                else {
                    finalActions[gotoTerm] = "S" + foundClosure.toString();
                }
                
                closure.closures.push(foundClosure);
            }
        }

        let state = new ParserState(finalActions, finalGoto);
        finalStates.push(state);
    }

    console.log(closures);

    return new ParserTable(Array.from(all_terminals), Array.from(all_nonterminals), finalRules, finalStates);
}

$("#tablegen-btn").click(function () {
    // take the input grammar, split it up into tokens, then generate a table for it
    const text = $("#grammar-input").val().split('\n');
    
    let rules = [];
    let all_terminals = new Set();
    let all_nonterminals = new Set();

    for (const line of text) {
        const parts = line.split("->");
        if (parts.length < 2) {
            throw new Error('TableGen: Input grammar is malformed!');
            return;
        }

        const nonterminal = parts[0].trim();
        all_nonterminals.add(nonterminal);
        const tokens = parts[1].trim().split(/\s+/);
        for (const token of tokens) {
            let first = token.charAt(0);
            if (first == first.toLowerCase()) {
                all_terminals.add(token);
            }
        }
        rules.push(new ProductionRule(nonterminal, tokens));
    }

    console.log(`terminals: ${[...all_terminals].join(',')}`);
    console.log(`nonterminals: ${[...all_nonterminals].join(',')}`);
    let table = generateTable(rules, all_terminals, all_nonterminals);
    console.log(`table: ${JSON.stringify(table)}`);

    initParseTable(table);
});