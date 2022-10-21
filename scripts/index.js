// =================================================================
// = index.js
// =  Description   : initializes index.html
// =  Author        : jtpeller
// =  Date          : March 29, 2022
// =================================================================

let content;

document.addEventListener("DOMContentLoaded", function() {
    // get d3 objects
    content = d3.select('#content');

    //
    // initialize site
    //
    let banner = content.append('div')
        .classed('banner', true);

    let title = banner.append('span')
        .classed('title-box', true)
        .append('h1')
        .classed('title-card', true)
        .text(`jtpeller's Geography Quizzes`);

    // links
    let links = content.append('div')
        .classed('d-flex justify-content-center link-card', true);

    let linkdiv = links.append('div')
        .classed('row fit-content', true);

    let chunks = chunkify(ll, 2, true);

    for (var i = 0; i < chunks.length; i++) {
        var col = linkdiv.append('div')
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
})
