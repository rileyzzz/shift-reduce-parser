
// encapsulate the current state of the parse operation
class ParseContext {
    constructor(table, tokens) {
        this.table = table;
        this.tokens = tokens;

        this.stack = [];
        // always start with state 0
        this.pushState(0);
        

        this.ast = [];
        this.idle = true;
    }

    getData() {
        return {
            table: this.table,
            tokens: this.tokens.slice(),
            stack: this.stack.slice(),
            // deep copy the AST
            ast: JSON.parse(JSON.stringify(this.ast))
        };
    }

    setData(data) {
        this.table = data["table"];
        this.tokens = data["tokens"];
        this.stack = data["stack"];
        this.ast = data["ast"];
    }

    pushState(state) {
        this.stack.push({
            type: "state",
            data: state
        });
    }

    pushToken(token) {
        this.stack.push({
            type: "token",
            data: token
        });
    }

    pushRule(rule) {
        this.stack.push({
            type: "rule",
            data: rule
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

    getStack() {
        let str = "";
        for (const val of this.stack)
            str += val["data"];
        return str;
    }

    * shift(newState) {
        if (this.tokens.length == 0)
            throw new Error('ParseContext.shift: No tokens left to shift!');
        
        yield;

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

        yield;

        // reduce using production rule "rule"
        const matchRule = this.table.rules[rule];
        const matchTokens = matchRule.matches;
        let astChildren = [];
        
        for (let i = matchTokens.length - 1; i >= 0; i--) {
            // ignore state suffix
            this.pop();
            
            let check = this.pop();
            if (check["type"] != "token" && check["type"] != "rule")
                throw new Error(`ParseContext:reduce: Unexpected stack element ${check}`);

            if (check["data"] != matchTokens[i])
                throw new Error(`ParseContext:reduce: Failed to match '${check["data"]}' for production rule ${(rule + 1)}! (Expected '${matchTokens[i]}')`);
            
            // grab the items off the end of the ast
            astChildren.push(this.ast.pop());
        }
        
        this.ast.push({
            "name": matchRule.result,
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
        const result = matchRule.result;
        this.pushRule(result);

        // now find out what to do! (rhyme x4)
        const stateIndex = state["data"];
        if (stateIndex < 0 || stateIndex >= this.table.states.length)
            throw new Error(`ParseContext:reduce: unexpected state index ${stateIndex}`);

        let gotoElements = this.table.states[stateIndex].gotoElements;
        // don't bother highlighting if result is completely wack
        if (result in gotoElements) highlightElement(gotoElements[result]);
    
        const goto = this.table.states[stateIndex].goto;
        if (!(result in goto))
            throw new Error(`ParseContext:reduce: Failed to resolve goto for rule '${result}' at state ${stateIndex}! (Expected one of ${Object.keys(goto)})`);
        const newState = goto[result];
        this.pushState(newState);
    }

    * run() {
        if (this.tokens == null || this.tokens.length == 0)
            throw new Error("ParseContext:run: no tokens to parse!!!");
        
        while (this.tokens != null && this.tokens.length > 0) {
            this.idle = false;
            
            const state = this.peek();
            if (state["type"] != "state")
                throw new Error(`ParseContext:run: expected state index in stack, found ${state}`);
            
            // states are already 0 indexed
            const stateIndex = state["data"];
            if (stateIndex < 0 || stateIndex >= this.table.states.length)
                throw new Error(`ParseContext:run: unexpected state index ${stateIndex}`);
            
            // pull the appropriate action for this state
            const nextToken = this.tokens[0];
            
            let actionElements = this.table.states[stateIndex].actionElements;
            clearHighlight();
            if (nextToken in actionElements) highlightElement(actionElements[nextToken]);
            
            const actions = this.table.states[stateIndex].actions;
            if (!(nextToken in actions))
                throw new Error(`ParseContext:run: Failed to resolve action for token '${nextToken}' at state ${stateIndex}! (Expected one of ${Object.keys(actions)})`);
            const nextAction = actions[nextToken];
    
            if (nextAction == "accept") {
                // we're done here
                doneHighlight();
    
                // bundle up the AST
                this.ast = [{
                    "name": "",
                    "children": this.ast
                }];
                break;
            }
            else if (nextAction.charAt(0) == 'S') {
                let shiftState = parseInt(nextAction.substring(1));
                yield* this.shift(shiftState);
            }
            else if (nextAction.charAt(0) == 'R') {
                let reduceRule = parseInt(nextAction.substring(1));
                yield* this.reduce(reduceRule);
            }
            else {
                throw new Error(`ParseContext:run: Unknown action '${nextAction}'!`);
            }
    
            // yield after each instruction so it's easy to step through
            this.idle = true;
            yield;
        }
        
        return true;
    }
}

function displayParseTable(table) {
    let tableDiv = $(".parser-table");
    tableDiv.empty();

    table.elements = [];

    // groups
    let header = $("<tr></tr>");
    header.append("<th></th>");
    header.append(`<th class="parser-primary" colspan=${table.terminals.length}>Action</th>`);
    header.append(`<th class="parser-spacer"></th>`); // spacer
    header.append(`<th class="parser-primary" colspan=${table.nonterminals.length}>Goto</th>`);
    tableDiv.append(header);

    // labels
    let subheader = $("<tr></tr>");
    subheader.append(`<td class="parser-primary">State</td>`);
    for (const terminal of table.terminals)
        subheader.append(`<td class="parser-secondary">${terminal}</td>`);
    subheader.append(`<td class="parser-spacer"></td>`); // spacer
    for (const nonterminal of table.nonterminals)
        subheader.append(`<td class="parser-secondary">${nonterminal}</td>`);
    tableDiv.append(subheader);

    for (let stateIndex = 0; stateIndex < table.states.length; stateIndex++) {
        let state = table.states[stateIndex];
        state.actionElements = {};
        state.gotoElements = {};

        let row = $("<tr></tr>");

        row.append(`<td class="parser-primary">${stateIndex}</td>`);

        for (const terminal of table.terminals) {
            let element = null;
            if (terminal in state.actions)
                element = $(`<td class="parser-secondary">${state.actions[terminal]}</td>`);
            else
                element = $(`<td class="parser-secondary"></td>`);
            
            row.append(element);
            state.actionElements[terminal] = element;
            table.elements.push(element);
        }

        row.append(`<td class="parser-spacer"></td>`); // spacer
        for (const nonterminal of table.nonterminals) {
            let element = null;
            if (nonterminal in state.goto)
                element = $(`<td class="parser-secondary">${state.goto[nonterminal]}</td>`);
            else
                element = $(`<td class="parser-secondary"></td>`);
            
            row.append(element);
            state.gotoElements[nonterminal] = element;
            table.elements.push(element);
        }

        tableDiv.append(row);
    }
}

function clearHighlight() {
    // clear old highlights
    $(".table-complete").removeClass("table-complete");
    $(".parser-highlight").removeClass("parser-highlight");
    $(".parser-highlight-invalid").removeClass("parser-highlight-invalid");
}

function highlightElement(element) {
    if (element.text() != "")
        element.addClass("parser-highlight");
    else
        element.addClass("parser-highlight-invalid");
}

function doneHighlight() {
    $(".parser-table").addClass("table-complete");
}

function importJSONTable(json) {
    const terminals = json["terminals"];
    const nonterminals = json["nonterminals"];
    const rules = json["rules"];
    const states = json["states"];

    let tableRules = [];
    for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
        const rule = rules[ruleIndex];
        let ruleObj = new ParserRule(rule["match"], rule["result"]);
        tableRules.push(ruleObj);
    }

    let tableStates = [];
    for (let stateIndex = 0; stateIndex < states.length; stateIndex++) {
        const state = states[stateIndex];
        let stateObj = new ParserState(state["actions"], state["goto"]);
        tableStates.push(stateObj);
    }

    return new ParserTable(terminals, nonterminals, tableRules, tableStates);
}


let table = null;
let running = false;
let context = null;
let history_buffer = [];
let steps_since_idle = 0;

function initParseTable(ptable) {
    table = ptable;
    displayParseTable(ptable);
}

function pushHistory() {
    history_buffer.push(context.getData());
}

function popHistory() { 
    if (history_buffer.length > 0) {
        let hist = history_buffer.pop();
        context.setData(hist);
    }
}

// interface logic
let parse_routine = null;

$("#run-btn").click(function () {
    if (running || table == null)
        return;
    
    let textInput = $("#text-input");
    textInput.prop('readonly', true);
    let tokens = splitTokens(table, textInput.val());
    console.log(`tokens: ${tokens}`);

    running = true;
    context = new ParseContext(table, tokens);
    parse_routine = context.run();

    history_buffer = [];
    steps_since_idle = 0;

    $(".idle-controls").addClass("disabled");
    $(".running-controls").removeClass("disabled");
    $(".stack-textbox").val(context.getStack());
});

$("#next-btn").click(function () {
    if (!running || parse_routine == null)
        return;
    
    if (context.idle) {
        pushHistory();
        steps_since_idle = 0;
    }
    parse_routine.next();
    steps_since_idle++;

    // update stack display
    $(".stack-textbox").val(context.getStack());
});

$("#prev-btn").click(function () {
    if (!running || parse_routine == null)
        return;

    // ignore if we're already at the first instruction
    if (history_buffer.length <= 1)
        return;
    
    // if we're halfway through an instruction,
    // finish it up to bring the context back into the idle state
    if (!context.idle) {
        while (!context.idle)
            parse_routine.next();
    }
    
    // if we're at the first step, do a double pop,
    // to go back to the previous instruction rather than the start of this one
    if (steps_since_idle <= 1)
        popHistory();
    
    // pop history back to the previous idle state,
    // and run to update the interface
    popHistory();
    pushHistory();
    parse_routine.next();
    steps_since_idle = 1;
    
    // update stack display
    $(".stack-textbox").val(context.getStack());
});

$("#stop-btn").click(function () {
    if (!running)
        return;
    running = false;
    parse_routine = null;
    context = null;

    let textInput = $("#text-input");
    textInput.prop('readonly', false);

    $(".running-controls").addClass("disabled");
    $(".idle-controls").removeClass("disabled");
    $(".stack-textbox").val("");
});

