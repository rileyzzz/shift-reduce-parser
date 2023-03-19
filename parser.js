
// encapsulate the current state of the parse operation
class ParseContext {
    constructor(table, tokens) {
        this.table = table;
        this.tokens = tokens;

        this.stack = [];
        // always start with state 0
        this.pushState(0);
        

        this.ast = [];
    }

    pushState(state) {
        this.stack.push({
            "type": "state",
            "data": state
        });
    }

    pushToken(token) {
        this.stack.push({
            "type": "token",
            "data": token
        });
    }

    pushRule(rule) {
        this.stack.push({
            "type": "rule",
            "data": rule
        });
    }

    peek() {
        if (this.stack.length == 0)
            throw new Error('ParseContext.peek: Stack is empty!');
        
        return this.stack[this.stack.length - 1];
    }

    pop() {
        if (this.stack.length == 0)
            throw new Error('ParseContext.pop: Stack is empty!');
        
        return this.stack.pop();
    }

    shift(newState) {
        if (this.tokens.length == 0)
            throw new Error('ParseContext.shift: No tokens left to shift!');
        
        // grab the next token
        const nextToken = this.tokens.shift();
        this.pushToken(nextToken);
        // and set our new state
        this.pushState(newState);

        // add to the AST
        this.ast.push({
            "name": nextToken,
            "children": []
        });
    }

    * reduce(rule) {
        // rules are 0 indexed internally
        rule = rule - 1;
        if (rule < 0 || rule >= this.table.rules.length)
            throw new Error(`ParseContext:reduce: Invalid rule index ${(rule + 1)}!`);

        // reduce using production rule "rule"
        const matchRule = this.table.rules[rule];
        let astChildren = [];
        
        for (let i = matchRule.length - 1; i >= 0; i--) {
            // ignore state suffix
            this.pop();
            
            let check = this.pop();
            if (check["type"] != "token" && check["type"] != "rule")
                throw new Error(`ParseContext:reduce: Unexpected stack element ${check}`);

            if (check["data"] != matchRule[i])
                throw new Error(`ParseContext:reduce: Failed to match '${check["data"]}' for production rule ${(rule + 1)}! (Expected '${matchRule[i]}')`);
            
            // grab the items off the end of the ast
            astChildren.push(this.ast.pop());
        }
        
        this.ast.push({
            "name": matchRule["result"],
            "children": astChildren
        });

        // if we got through the loop without errors, we successfully matched
        yield;
        
        // get ready for my triple rhyme...
        // reduce part 2, electric boogaloo: resolve the appropriate goto
        const state = this.peek();
        if (state["type"] != "state")
            throw new Error(`ParseContext:reduce: expected state index in stack, found ${state}`);
        
        // push the next rule
        const result = matchRule["result"];
        this.pushRule(result);

        // now find out what to do! (rhyme x4)
        const stateIndex = state["data"] - 1;
        if (stateIndex < 0 || stateIndex >= this.table.states.length)
            throw new Error(`ParseContext:reduce: unexpected state index ${(stateIndex + 1)}`);
        
        const goto = this.table.states[stateIndex].goto;
        if (!(result in goto))
            throw new Error(`ParseContext:reduce: Failed to resolve goto for rule '${result}' at state ${(stateIndex + 1)}! (Expected one of ${Object.keys(goto)})`);
        const newState = goto[result];
        this.pushState(newState);
    }

    * run() {
        const state = this.peek();
        if (state["type"] != "state")
            throw new Error(`ParseContext:run: expected state index in stack, found ${state}`);
        
        const stateIndex = state["data"] - 1;
        if (stateIndex < 0 || stateIndex >= this.table.states.length)
            throw new Error(`ParseContext:run: unexpected state index ${(stateIndex + 1)}`);
        
        // pull the appropriate action for this state
        if (this.tokens.length == 0)
            throw new Error("ParseContext:run: no tokens left!!!");
        const nextToken = this.tokens[0];

        const actions = this.table.states[stateIndex].actions;
        if (!(nextToken in actions))
            throw new Error(`ParseContext:run: Failed to resolve action for token '${nextToken}' at state ${(stateIndex + 1)}! (Expected one of ${Object.keys(actions)})`);
        const nextAction = actions[nextToken];
        if (nextAction == "accept") {
            // we're done here

            // bundle up the AST
            this.ast = [{
                "name": "",
                "children": this.ast
            }];
            
            return true;
        }
        else if (nextAction.charAt(0) == 'S') {
            let shiftState = parseInt(nextAction.substring(1));
            this.shift(shiftState);
        }
        else if (nextAction.charAt(0) == 'R') {
            let reduceRule = parseInt(nextAction.substring(1));
            yield* this.reduce(reduceRule);
        }
        else {
            throw new Error(`ParseContext:run: Unknown action '${nextAction}'!`);
        }

        // yield after each instruction so it's easy to step through
        yield;
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
    const rules = json["rules"];
    const states = json["states"];

    let tableRules = [];
    for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
        const rule = rules[ruleIndex];
        let ruleObj = new ParserState(rule["match"], rule["result"]);
        tableRules.push(ruleObj);
    }

    let tableStates = [];
    for (let stateIndex = 0; stateIndex < states.length; stateIndex++) {
        const state = states[stateIndex];
        let stateObj = new ParserState(state["actions"], state["goto"]);
        tableStates.push(stateObj);
    }

    return new ParserTable(tableRules, tableStates);
}