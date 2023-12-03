// =================================================================
// = index.js
// =  Description   : initializes index.html
// =  Author        : jtpeller
// =  Date          : March 29, 2022
// =================================================================

document.addEventListener("DOMContentLoaded", function() {
    let chunks = chunkify(ll, 2, true);

    let row = d3.create('div')
        .classed('row', true);

    for (var i = 0; i < chunks.length; i++) {
        var col = row.append('div')
            .classed('link-list col', true);

        var temp = chunks[i];

        for (var j = 0; j < temp.length; j++) {
            col.append('a')
                .classed('btn btn-item gradient', true)
                .attr('href', temp[j].html)
                .append('a')
                .classed('btn-link', true)
                .attr('href', temp[j].html)
                .text(temp[j].link);
        }
    }
    
    d3.select('#link-div').append(() => row.node());
})
