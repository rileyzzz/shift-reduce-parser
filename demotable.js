// built-in table for the demo

$( document ).ready(function () {
    $.getJSON("demotable.json", function(json) {
        let table = importJSONTable(json);
        initParseTable(table);
    });
});