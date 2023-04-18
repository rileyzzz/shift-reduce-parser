// built-in table for the demo

$( document ).ready(function () {
    let testGrammar = `
    Start = Add
    Add = Add + Factor
    Add = Factor
    Factor = Factor * Term
    Factor = Term
    Term = ( Add )
    Term = name
    Term = int
    `;
    
    $.getJSON("demotable.json", function(json) {
        let table = importJSONTable(json);
        initParseTable(table);
        $(".name-text").val(json["name"]);
        console.log(`Loaded '${json["name"]}'`);
    });
});