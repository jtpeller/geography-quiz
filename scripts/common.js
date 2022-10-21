// =================================================================
// = common.js
// =  Description   : utility functions
// =  Author        : jtpeller
// =  Date          : October 10, 2022
// =================================================================

let regions = ["Africa", "Asia", "Europe", "North America", "Oceania", "South America"];

let ll = [];

for (var i = 0; i < regions.length; i++) {
    ll.push({
        html: `quiz.html?${regions[i]}`,
        link: regions[i]
    })
}

/**
 * initNavbar() -- initializes the navbar for navigating the site
 */
 function initNavbar(header, idx) {
    let nav = header.append('nav')
    nav.classed('navbar navbar-expand-lg navbar-dark my-bg-dark', true)

    let navdiv = nav.append('div')
        .classed('container-fluid', true);
    
    let brand = navdiv.append('a')
        .classed('navbar-brand d-lg-none gradient-transparent border-highlight', true)
        .attr('href', 'index.html')
        .text('Geography');
    
    //
    // add the hamburger menu button for mobile/thin
    //
    let menu = navdiv.append('button')
        .classed('navbar-toggler', true)
        .attr('type', 'button')
        .attr('data-bs-toggle', 'collapse')
        .attr('data-bs-target', '#navbar-content')
        .attr('aria-controls', 'navbar-content')
        .attr('aria-expanded', 'false')
        .attr('aria-label', 'Toggle navigation');

    menu.append('span')
        .classed('navbar-toggler-icon', true);

    //
    // build the links
    //
    let linkdiv = navdiv.append('div')
        .classed('collapse navbar-collapse', true)
        .attr('id', 'navbar-content');

    let ul = linkdiv.append('ul')
        .classed('navbar-nav mx-auto mb-2 mb-lg-0', true);

    ul.append('a')
        .classed('navbar-brand d-none d-lg-block gradient-transparent border-highlight', true)
        .attr('href', 'index.html')
        .text('Geography');

    // iteratively add the links
    for (var i = 0; i < ll.length; i++) {
        if (idx == i) {
            ul.append('li')
                .classed('nav-item gradient-transparent', true)
                .append('a')
                .classed('nav-link active border-highlighted', true)
                .attr('aria-current', 'page')
                .attr('href', ll[i].html)
                .text(ll[i].link);
        } else {
            ul.append('li')
                .classed('nav-item gradient-transparent', true)
                .append('a')
                .classed('nav-link active border-highlight', true)
                .attr('aria-current', 'page')
                .attr('href', ll[i].html)
                .text(ll[i].link);
        }
    }
}

// pulled from: https://stackoverflow.com/questions/8188548/splitting-a-js-array-into-n-arrays
function chunkify(a, n, balanced) {
    if (n < 2)
        return [a];

    var len = a.length,
        out = [],
        i = 0,
        size;

    if (len % n === 0) {
        size = Math.floor(len / n);
        while (i < len) {
            out.push(a.slice(i, i += size));
        }
    }

    else if (balanced) {
        while (i < len) {
            size = Math.ceil((len - i) / n--);
            out.push(a.slice(i, i += size));
        }
    }

    else {

        n--;
        size = Math.floor(len / n);
        if (len % size === 0)
            size--;
        while (i < size * n) {
            out.push(a.slice(i, i += size));
        }
        out.push(a.slice(size * n));

    }

    return out;
}
