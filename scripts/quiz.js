// =================================================================
// = quiz.js
// =    Description : builds quiz.html
// =    Date        : April 25, 2022
// =    Author      : jtpeller
// =================================================================

// ids holds all the HTML ID tags for d3 to use
let ids = {
    userscore: '#userscore',
    totalscore: '#totalscore'
};

// elements
let header, content, title, svg,    // elements
    controls,                       // left side score thingy
    instruction,                    // says which country to select
    userscore, totalscore, percent, // scores 
    timer,                          // timer located inside controls
    zoom;
let map;

const dur = 500;

// country and region stuff
let region;
let countries = [];
let all_countries = [];
let idx;

// svg dims
let width, height;  // defined in init
let margin = {top: 10, left: 10, right: 10, bottom: 10};
let innerwidth, innerheight; // defined in init

let timerUpdate;        // timer interval function

// flags
let zoom_disabled = true;
let first_click = true;

//
// init page on load
//
document.addEventListener('DOMContentLoaded', function() {
    // set IDs, get d3 lets, etc.
    header = d3.select('#header');
    content = d3.select('#content')
        .classed('container', true);

    banner = content.append('div')
        .attr('id', 'banner')
        .classed('text-center', true);

    title = banner.append('h2')
        .classed('title', true)
        
    // add the instruction (tells user which country to click on)
    var div = banner.append('div')
        .attr('id', 'country-span');

    //div.append('span')
    //    .text('Select: ')
    //    .classed('h2', true);

    instruction = div.append('span')
        .classed('country-select h3', true)
        .text('');

    // add the left side (score & time) and right side (map)
    var rowdiv = content.append('div')
        .classed('row flex-center', true);
    
    var left = rowdiv.append('div')
        .attr('id', 'left')
        .classed('col-3', true);

    var right = rowdiv.append('div')
        .attr('id', 'right')
        .classed('col', true);

    controls = left.append('div')
        .attr('id', 'controls');
    svg = right.append('svg')
        .attr('id', 'svg');

    // initialize the webpage
    init();
})


function init() {
    // first, add everything possible without loading the data
    // this makes it sure that it's nice and snappy (and I don't load ~20MB of data)
    
    // get region & its index
    region = location.search.replace('?', '').replace('%20', ' ');
    var idx = regions.indexOf(region);

    title.text(`${region} Quiz`)

    // initialize navbar
    initNavbar(header, idx);

    // add the timer
    timer = controls.append('div')
        .append('h1')
        .attr('id', 'timer')
        .classed('text-center monospace', true)
        .text('00:00:00');

    controls.append('hr');

    // add the score
    let score = controls.append('div')
        .classed('text-center', true)
    
    var div = score.append('div')
        .classed('row', true);

    var scoretable = div.append('div')
        .classed('my-table', true);

    var headers = ["Correct", "Incorrect", "Guesses", "Total", "Score"];

    for (var i = 0; i < headers.length; i++) {
        var row = scoretable.append('div')
            .classed('row', true)

        row.append('div')
            .classed('col h5 text-end', true)
            .text(headers[i])

        row.append('div')
            .classed('col h5 text-start', true)
            .attr('id', headers[i])
            .text('0')
    }

    // set up d3 elements for this
    userscore =  d3.select('#' + headers[0]);
    wrongscore = d3.select('#' + headers[1]);
    totalguess = d3.select('#' + headers[2]);
    totalscore = d3.select('#' + headers[3]);
    percent =    d3.select('#' + headers[4]);

    // zoom setup
    zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on('zoom', function() {
            d3.select('#svg-g').selectAll('path').attr('transform', d3.event.transform);
            d3.select('#labels').selectAll('text').attr('transform', d3.event.transform);
        });

    // add a reset zoom button
    svg_toolbox = d3.select('#right').append('div')
        .attr('id', 'svg-toolbox')
        .classed('toolbox', true)

    var reset = svg_toolbox.append('button')
        .classed('btn site-btn', true)
        .attr('title', 'Reset Zoom')
        .on('click', function() {
            svg.transition().duration(dur).call(zoom.transform, d3.zoomIdentity);
        }).dispatch('click');

    reset.append('img')
        .classed('btn-svg', true)
        .attr('src', 'resources/reset_zoom.svg')
        .attr('alt', 'Reset Zoom');

    svg.call(zoom)                      // establish zoom behavior
        .on('dblclick.zoom', function() {
            svg.transition().duration(dur).call(zoom.transform, d3.zoomIdentity);
        });     // no dbl click to zoom

    // add a disable zoom checkbox
    controls.append('hr');
    var div = controls.append('div')
        .classed('form-check form-switch', true);

    div.append('input')
        .classed('form-check-input', true)
        .attr('type', 'checkbox')
        .attr('value', '')
        .attr('id', 'disable-zoom')
        .property('checked', true)
        .on('click', function() {
            zoom_disabled = d3.select(this).property('checked');
        })

    div.append('label')
        .classed('form-check-label', true)
        .attr('for', 'disable-zoom')
        .text('Disable Zoom Onto Countries')


    // add a reset button and some other stuff
    var restart = svg_toolbox.append('button')
        .classed('btn site-btn', true)
        .attr('title', 'Restart Quiz')
        .on('click', function() {
            resetQuiz();
            initMap();
        })

    restart.append('img')
        .classed('btn-svg', true)
        .attr('src', 'resources/restart.svg')
        .attr('alt', 'Restart');

    // initialize the map last
    initMap();
}

function initMap() {
    // reset all counters, reset all map
    resetQuiz();
        
    // svg inits
    width = +svg.style('width').replace('px', '');
    height = +svg.style('height').replace('px', '');
    innerwidth = width - margin.left - margin.right;
    innerheight = height - margin.top - margin.bottom;

    // promise data
    Promise.all([
        d3.json(`data/continents/${region.replace(' ', '_')}.geojson`)
    ]).then(function(values) {
        svg.html('');       // we're drawing the map, so make sure it's empty
        drawMap(values[0], region);
    })
}

function drawMap(geojson, continent) {
    let projection = getProjection(geojson, continent);
    let geogen = d3.geoPath().projection(projection);

    // build the list of the countries of the continent
    countries = [];
    for (var i = 0; i < geojson.features.length; i++) {
        countries.push(geojson.features[i].properties.name_long);
    }

    // save countries off to a backup (for resets)
    all_countries = [...countries];
    
    // then, randomly pick a country and set instruction
    idx = rng(0, countries.length)
    instruction.text(countries[idx])
    totalscore.text(all_countries.length)

    let g = svg.append('g').attr('id', 'svg-g');
    let labels = svg.append('g')
        .attr('id', 'labels');

    // hide labels when they're close to the user's mouse
    svg.on('mousemove', function(d, i) {
        const DIST_THRESHOLD = 75;

        // get correct mouse coords
        var mouse = d3.mouse(this);
        var transform = d3.zoomTransform(svg.node());
        mouse = transform.invert(mouse);

        // loop through every label
        for (var j = 0; j < (+totalguess.text()); j++) {
            // select the label
            var label = d3.select('#label-'+(j+1));

            // calculate dx and dy
            var x = label.attr('x');
            var y = label.attr('y');

            var dx = x-mouse[0];
            var dy = y-mouse[1];

            // compute distance
            var dist = Math.sqrt(Math.pow(dx,2) + Math.pow(dy,2));

            // if distance is within the threshold, hide it
            if (dist < DIST_THRESHOLD) {
                label.style('display', 'none');
            } else {
                label.style('display', 'block');
            }
        }
    })
    
    // add the map
    map = g.selectAll('.map')
        .data(geojson.features)
        .join('path')
        .attr('d', geogen)
        .classed('map', true)
        .attr('id', function(d) { return d.properties.name_long.replaceAll(' ', '_').replaceAll('.', ''); })
        .on('mouseover', function(d, i) {
            d3.select(this).classed('highlighted', true);
        })
        .on('click', function(d, i) {
            if (first_click) {
                startTimer();
                first_click = false;
            }

            var c = countries[idx]

            d3.select('#'+c.replaceAll(' ', '_').replaceAll('.', ''))
                .classed(d.properties.name_long === c ? 'correct' : 'incorrect', true)
                .on('mouseover', null)
                .on('mouseout', null) // clear out the mouse listeners
                .on('click', null)
                .classed('highlighted', false); // remove any highlighting

            if (d.properties.name_long === c) {
                userscore.text((+userscore.text())+1)
                var val = +userscore.text() / +totalscore.text() * 100
                percent.text( `${Math.round( (val + Number.EPSILON) * 100) / 100}%` )
            } else {
                wrongscore.text( (+wrongscore.text())+1);
            }
            
            // update guess count
            totalguess.text( (+totalguess.text())+1 )

            // add the label for the correct country
            var coords = getCoords(geojson, c);
            labels.append('text')
                .text(c)
                .attr('id', 'label-'+ (+totalguess.text()))
                .classed('country-label', true)
                .attr('text-anchor', 'middle')
                .attr('x', coords[0])
                .attr('y', coords[1])

            // TODO: transform the label by zoom/pan

            // if user is finished, finalize the map
            if (+totalguess.text() >= +totalscore.text()) {
                // remove click listener (user is done)
                d3.selectAll('.map').on('click', null);

                d3.select('#country-span')
                    .html('')
                    .append('h2')
                    .text('Congratulations, you have completed the quiz!');
                    
                // stop timer
                clearInterval(timerUpdate);
            } else {        // otherwise, continue the quiz
                // zoom into/center on the correct country (if applicable)
                if (zoom_disabled == false) {
                    var x = coords[0], y = coords[1];
                    svg.transition().duration(dur)
                        .call(
                            zoom.transform,
                            d3.zoomIdentity.translate(width/2, height/2).scale(2).translate(-x, -y)
                        );
                }
                    
                // remove country from countries & select a new one
                countries.splice(idx, 1);
    
                idx = rng(0, countries.length);
                c = countries[idx];
                instruction.text(c);
            }
        })
        .on('mouseout', function(d, i) {
            d3.select(this).classed('highlighted', false);
        });
}

/**
 * getProjection() -- returns the d3 geo projection for the specified continent.
 *  This function allows flexibility for each continent
 * @param continent     the continent to get the projection for
 * @return projection   the projection for the continent
 */
function getProjection(geojson, continent) {
    if (continent == 'Africa') {
        return d3.geoEquirectangular()
            .fitSize([innerwidth, innerheight], geojson)
            .precision(0.1);
    } else if (continent == 'Asia') {
        return d3.geoEquirectangular()
            .rotate([-12, 0])
            .fitSize([innerwidth, innerheight], geojson)
            .precision(0.1);
    } else if (continent == 'Europe') {
        return d3.geoMercator()
            .rotate([-12, 0])
            .fitSize([innerwidth, innerheight], geojson)
            .precision(1);
    } else if (continent == 'North America') {
        return d3.geoNaturalEarth1()
            .rotate([14, 0])
            .fitSize([innerwidth, innerheight], geojson)
            .precision(0.1);
    } else if (continent == 'Oceania') {
        return d3.geoEquirectangular()
            .rotate([160, 0])
            .fitSize([innerwidth, innerheight], geojson)
            .precision(0.1);
    } else if (continent == 'South America') {
        return d3.geoEquirectangular()
            .fitSize([innerwidth, innerheight], geojson)
            .precision(0.1);
    } else if (continent == 'World') {
        return d3.geoEquirectangular()
            .rotate([-8, 0])
            .fitSize([innerwidth, innerheight], geojson)
            .precision(0.1);
    } else {
        return null;
    }
}

function rng(min, max) {
    return Math.floor(Math.random() * max) - min;
}

function getCoords(geojson, country) {
    // first, find the country
    var found = null;
    for (var i = 0; i < geojson.features.length; i++) {
        if (geojson.features[i].properties.name_long == country) {
            found = d3.select('#'+geojson.features[i].properties.name_long.replaceAll(' ', '_').replaceAll('.', ''))
            break;
        }
    }

    // now, figure out where the midpoint of the country is
    // make the d3 selection
    var element = found.node();
    var bbox = element.getBBox();
    return [bbox.x + bbox.width/2, bbox.y + bbox.height/2];
}

function startTimer() {
    var start = Date.now();
    timerUpdate = setInterval(function() {
        var delta = new Date(Date.now() - start);
        var min = delta.getMinutes();
        var sec = delta.getSeconds();
        var ms = Math.floor(delta.getMilliseconds() / 10);

        // display this time
        if (min < 10) {
            min = "0"+min;  // append a starting zero
        } 
        if (sec < 10) {
            sec = "0"+sec;
        }
        if (ms < 10) {
            ms = "0"+ms;
        }
        timer.text(`${min}:${sec}:${ms}`)

    }, 20)      // update timer
}

/**
 * resets for a new quiz
 */
function resetQuiz() {
    // reset map
    d3.selectAll('.map').classed('correct incorrect', false);
    d3.selectAll('.country-label').remove();        // remove all labels

    // reset timer
    clearInterval(timerUpdate);
    timer.text('00:00:00')
    first_click = true;

    // reset counters
    userscore.text('0');
    wrongscore.text('0');
    totalguess.text('0');
    totalscore.text(all_countries.length);
    percent.text('0');

    // reset #country-span
    var div = d3.select('#country-span')
        .html('');

    div.append('span')
        .text('Select: ')
        .classed('h2', true);

    instruction = div.append('span')
        .classed('country-select h3', true)
        .text('');
        
    // reset countries
    countries = all_countries;

    // pick a new country
    idx = rng(0, countries.length);
    c = countries[idx];
    instruction.text(c);
}