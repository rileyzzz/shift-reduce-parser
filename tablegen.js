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
    constructor() {
        this.items = [];
        this.closures = [];
    }
};

function setsEqual(a, b) {
    if (a == null || b == null)
        return false;

    for (const [key, set] of Object.entries(a)) {
        // assume both sets have the same keys, and keys cannot be replaced
        if (!(key in b))
            return false;
        
        if (set.size != b[key].size)
            return false;
    }
    return true;
}

function cloneSet(set) {
    let newSet = {};
    for (const [key, innerSet] of Object.entries(set)) {
        newSet[key] = new Set(innerSet);
    }
    return newSet;
}

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

    // determine the first and follow sets for each nonterminal
    let first = {};
    let oldFirst = null;
    for (const rule of rules) {
        first[rule.nonterminal] = new Set();
    }
    while (!setsEqual(first, oldFirst)) {
        oldFirst = cloneSet(first);

        for (const rule of rules) {
            if (rule.terms.length != 0) {
                // cascade across any terms that have epsilon
                let termIndex = 0;
                do {
                    if (all_nonterminals.has(rule.terms[termIndex])) {
                        first[rule.terms[termIndex]].forEach(e => {
                            if (e !== '')
                                first[rule.nonterminal].add(e);
                        });
                    }
                    else {
                        // break after the first terminal if we've had empty first sets up until now
                        first[rule.nonterminal].add(rule.terms[termIndex]);
                        break;
                    }
                    termIndex++;
                } while (termIndex < rule.terms.length && first[rule.terms[termIndex - 1]].has(''));
            }
            else {
                // this rule contains epsilon
                first[rule.nonterminal].add('');
            }
        }
    }

    console.log(`First sets:`);
    for (const [key, set] of Object.entries(first)) {
        console.log(`\t${key}: {${Array.from(set).join(',')}}`);
    }

    let follow = {};
    let oldFollow = null;
    for (const rule of rules) {
        follow[rule.nonterminal] = new Set();
    }
    follow[augRule.nonterminal].add("$");
    while (!setsEqual(follow, oldFollow)) {
        oldFollow = cloneSet(follow);
        
        for (const rule of rules) {
            for (let termIndex = 0; termIndex < rule.terms.length; termIndex++) {
                // only worry about follow for nonterminals
                if (!all_nonterminals.has(rule.terms[termIndex]))
                    continue;
                
                if (termIndex == rule.terms.length - 1) {
                    // following set of the last term is the following set of the parent term
                    follow[rule.nonterminal].forEach(e => {
                        follow[rule.terms[termIndex]].add(e);
                    });
                }
                else {
                    // following set of earlier terms is the first set of the next term
                    let followTermIndex = termIndex + 1;
                    do {
                        if (all_nonterminals.has(rule.terms[followTermIndex])) {
                            first[rule.terms[followTermIndex]].forEach(e => {
                                if (e !== '')
                                    follow[rule.terms[termIndex]].add(e);
                            });
                        }
                        else {
                            // break after the first terminal if we've had empty first sets up until now
                            follow[rule.terms[termIndex]].add(rule.terms[followTermIndex]);
                            break;
                        }
                        followTermIndex++;
                    } while (followTermIndex < rule.terms.length && first[rule.terms[followTermIndex - 1]].has(''));
                    
                    // if we reached the end, and we still have an epsilon, add it
                    if (followTermIndex == rule.terms.length && first[rule.terms[followTermIndex - 1]].has(''))
                        follow[rule.terms[termIndex]].add('');
                }
            }
        }
    }

    console.log(`Follow sets:`);
    for (const [key, set] of Object.entries(follow)) {
        console.log(`\t${key}: {${Array.from(set).join(',')}}`);
    }

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
                        if (key in finalActions)
                            console.error("reduce conflict!");
                        // use the actual index of the rule, not the augmented
                        // however, rules are 1-indexed, so we don't need to worry about subtracting
                        finalActions[key] = "R" + item.rule.toString();
                    }
                }
            }
            else {
                // this isn't the final item, find or generate its closure
                let gotoTerm = rule.terms[item.index];
                let lookaheadIndex = item.index + 1;
                let searchItem = new LRItem(item.rule, lookaheadIndex);

                // try to find an existing closure that fits this item
                let foundClosure = -1;

                for (let j = 0; j < closures.length; j++) {
                    if (closures[j].items.length > 0 && closures[j].items[0].equals(searchItem)) {
                        foundClosure = j;
                        break;
                    }
                }
                
                if (foundClosure == -1) {
                    // no preexisting closure found, create a new one
                    foundClosure = closures.length;
                    let newClosure = new TransitiveClosure();
                    newClosure.items.push(searchItem);
                    
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
                
                if (all_nonterminals.has(gotoTerm)) {
                    if (gotoTerm in finalGoto)
                        console.error(`goto conflict on closure ${searchClosure} term ${gotoTerm}! existing ${finalGoto[gotoTerm]} -> ${foundClosure}`);
                    finalGoto[gotoTerm] = foundClosure;
                }
                else {
                    if (gotoTerm in finalActions)
                        console.error(`action conflict on closure ${searchClosure} term ${gotoTerm}! existing ${finalActions[gotoTerm]} -> S${foundClosure}`);
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