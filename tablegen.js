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
        this.kernel = [];
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

function kernelsEqual(a, b) {
    if (a == null || b == null)
        return false;

    if (a.length != b.length)
        return false;

    for (let i = 0; i < a.length; i++) {
        if (!a[i].equals(b[i]))
            return false;
    }

    return true;
}

function kernelContainsRule(kernel, rule) {
    for (let i = 0; i < kernel.length; i++) {
        if (kernel[i].rule == rule)
            return true;
    }

    return false;
}

function cloneKernel(kernel) {
    newKernel = [];
    for (let i = 0; i < kernel.length; i++) {
        newKernel.push(new LRItem(kernel[i].rule, kernel[i].index));
    }
    return newKernel;
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

    let s0 = new TransitiveClosure();
    for (let i = 0; i < rules.length; i++) {
        let item = new LRItem(i, 0);
        s0.kernel.push(item);
    }
    closures.push(s0);
    console.log(`root closure: ${s0}`);

    let searchClosure = 0;
    while (searchClosure < closures.length) {
        // console.log(`process closure ${searchClosure}`);
        let closure = closures[searchClosure++];
        let finalActions = {};
        let finalGoto = {};

        function buildKernel(term) {
            let closureKernel = [];

            for (const item of closure.kernel) {
                const rule = rules[item.rule];
                if (item.index >= rule.terms.length)
                    continue;
                let gotoTerm = rule.terms[item.index];
                if (gotoTerm == term)
                    closureKernel.push(new LRItem(item.rule, item.index + 1));
            }

            // console.log(`\t built initial closure for term ${term}, length ${closureKernel.length}`);
            if (closureKernel.length == 0)
                return -1;
            
            // pad out the kernel to include all necessary items
            let oldKernel = null;
            while (!kernelsEqual(closureKernel, oldKernel)) {
                oldKernel = cloneKernel(closureKernel);
                
                // console.log(`reprocessing kernel`);
                for (const item of closureKernel) {
                    const rule = rules[item.rule];
                    if (item.index >= rule.terms.length)
                        continue;
                    let gotoTerm = rule.terms[item.index];

                    for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
                        if (rules[ruleIndex].nonterminal == gotoTerm && !kernelContainsRule(closureKernel, ruleIndex)) {
                            closureKernel.push(new LRItem(ruleIndex, 0));
                            // console.log(`adding zeroed rule ${ruleIndex} to closure`);
                        }
                    }
                }
            }

            // try to find an existing closure matching this signature, otherwise create a new one
            let foundClosure = -1;

            for (let j = 0; j < closures.length; j++) {
                if (closures[j].kernel.length > 0 && kernelsEqual(closures[j].kernel, closureKernel)) {
                    foundClosure = j;
                    break;
                }
            }

            // no closure found, make a new one
            if (foundClosure == -1) {
                // no preexisting closure found, create a new one
                foundClosure = closures.length;
                let newClosure = new TransitiveClosure();
                newClosure.kernel = closureKernel;
                closures.push(newClosure);
            }

            return foundClosure;
        }

        all_nonterminals.forEach(nonterminal => {
            let foundClosure = buildKernel(nonterminal);
            if (foundClosure != -1)
                finalGoto[nonterminal] = foundClosure;
        });
        all_terminals.forEach(terminal => {
            let foundClosure = buildKernel(terminal);
            if (foundClosure != -1)
                finalActions[terminal] = "S" + foundClosure;
        });

        // handle reductions
        for (const item of closure.kernel) {
            const rule = rules[item.rule];
            if (item.index >= rule.terms.length) {
                // exception for the augmented rule
                if (item.rule == 0) {
                    finalActions["$"] = "accept";
                }
                else {
                    // this is a final item, signal a reduce for each term that can follow this
                    for (const key of follow[rule.nonterminal]) {
                        if (key in finalActions)
                            console.error("reduce conflict!");
                        // use the actual index of the rule, not the augmented
                        // however, rules are 1-indexed, so we don't need to worry about subtracting
                        finalActions[key] = "R" + item.rule.toString();
                    }
                }
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