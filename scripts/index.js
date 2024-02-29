// =================================================================
// = index.js
// =  Description   : initializes index.html
// =  Author        : jtpeller
// =  Date          : March 29, 2022
// =================================================================
"use strict";

document.addEventListener("DOMContentLoaded", function() {
    const utils = new Utils();
    let chunks = utils.chunkify(2, true);

    // populate the row
    let row = utils.create('div', {classList: 'row'})
    for (let i = 0; i < chunks.length; i++) {
        let col = utils.append(row, 'div', {classList: 'col link-list'});
        let temp = chunks[i];

        // populate columns
        for (let j = 0; j < temp.length; j++) {
            let abtn = utils.append(col, 'a', {
                classList: 'btn btn-item gradient',
                href:  temp[j].href
            });
            utils.append(abtn, 'a', {
                classList: 'btn-link',
                href: temp[j].href,
                text: temp[j].text
            })
        }
    }
    utils.select('#link-div').append(row);
})
