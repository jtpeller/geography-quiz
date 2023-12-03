// =================================================================
// = quiz.js
// =    Description : builds quiz.html
// =    Date        : April 25, 2022
// =    Author      : jtpeller
// =================================================================

// elements
let svg,
    instruction,    // says which country to select
    timer;          // timer located inside controls
let zoom;           // zoom function

const dur = 500;

// country and region stuff
let region;                 // which region is being quizzed
let countries = [];         // countries of this region that haven't been selected yet
let all_countries = [];     // all countries of this region
let idx;                    // idx of country

// svg dims
const width = 1000;
const height = 640;
let innerwidth, innerheight;

let timerUpdate;        // timer interval function

// score values
let score = {
    cor: 0,     // correct
    inc: 0,     // incorrect
    gue: 0,     // user guess count
    tot: 0,     // total countries
    per: 0,     // percent correct
}

// score elements
let elem = {};

// flags
let zoom_disabled = true;
let first_click = true;

//
// init page on load
//
document.addEventListener('DOMContentLoaded', function() {
    header = d3.select('#header');

    // get region & its index
    if (this.location.search == '') {
        this.location.search = 'World'
    } else {
        region = location.search.replace('?', '').replace('%20', ' ');
    }
    var i = regions.indexOf(region);
    initNavbar(header, i);

    // update title
    d3.select('#title').text(`${region} Quiz`)

    // select instruction, timer, and map
    instruction = d3.select('#country-to-select');
    timer = d3.select('#timer')
    svg = d3.select('#map')
        .attr('viewBox', `0 0 ${width} ${height}`);
    
    elem = {
        cor: d3.select('#correct'),
        inc: d3.select('#incorrect'),
        gue: d3.select('#guesses'),
        tot: d3.select('#total'),
        per: d3.select('#percent'),
    }

    // initialize the map last
    initMap();
})

function initMap() {
    // reset all counters, reset all map
    resetQuiz();
    
    // svg inits
    const margin = {top: 10, left: 10, right: 10, bottom: 10};
    innerwidth = width - margin.left - margin.right;
    innerheight = height - margin.top - margin.bottom;

    // add behavior for the zoom functionality
    zoom = d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([1, 8])
        .on('zoom', zoomed);

    // add behavior for the reset button
    d3.select('#reset-btn').on('click', function(e) {
        svg.transition().duration(dur).call(zoom.transform, d3.zoomIdentity);
    }).dispatch('click');

    // double-click-to-zoom functionality set to zoom out only
    svg.call(zoom);

    // add behavior for disabling zoom (switch-checkbox)
    d3.select('#disable-zoom').on('click', function(e) {
        zoom_disabled = d3.select(this).property('checked');
    })

    // add a reset button and some other stuff
    d3.select('#restart-btn').on('click', function(e) {
        resetQuiz();
        initMap();
    })

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
    
    // set total countries count
    score.tot = all_countries.length;
    elem.tot.text(score.tot);

    // then, randomly pick a country and set instruction
    idx = rng(0, countries.length);
    instruction.text(countries[idx]);

    // append g elements
    let g = svg.append('g').attr('id', 'svg-g');
    let labels = svg.append('g').attr('id', 'labels');

    // hide labels when they're close to the user's mouse
    svg.on('mousemove', function(e) {
        const DIST_THRESHOLD = 75;

        // get correct mouse coords
        const mouse = d3.zoomTransform(svg.node()).invert(d3.pointer(e));

        // loop through every label
        for (var j = 0; j < score.gue; j++) {
            // select the label
            var label = d3.select(`#label-${j+1}`);
            // calculate dx and dy
            var x = label.attr('x');
            var y = label.attr('y');

            var dx = x - mouse[0];
            var dy = y - mouse[1];

            // compute distance
            var dist = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));

            // if distance is within the threshold, hide it
            if (dist < DIST_THRESHOLD) {
                label.style('display', 'none');
            } else {
                label.style('display', 'block');
            }
        }
    })
    
    // add the map
    g.selectAll('.map')
        .data(geojson.features)
        .join('path')
        .attr('d', geogen)
        .classed('map', true)
        .attr('id', function(d) { return d.properties.name_long.replaceAll(' ', '_').replaceAll('.', ''); })
        .on('mouseover', function(e, d) {
            d3.select(this).classed('highlighted', true);
        })
        .on('click', function(e, d) {
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
                elem.cor.text(++score.cor)
                var val = score.cor / score.tot * 100
                elem.per.text( `${Math.round( (val + Number.EPSILON) * 100) / 100}%` )
            } else {
                elem.inc.text(++score.inc);
            }
            
            // update guess count
            elem.gue.text(++score.gue)

            // add the label for the correct country
            var coords = getCoords(geojson, c);
            labels.append('text')
                .text(c)
                .attr('id', 'label-'+ score.gue)
                .classed('country-label', true)
                .attr('text-anchor', 'middle')
                .attr('x', coords[0])
                .attr('y', coords[1])

            // TODO: transform the label by zoom/pan

            // if user is finished, finalize the map
            if (score.gue >= score.tot) {
                // remove click listener (user is done)
                d3.selectAll('.map').on('click', null);

                d3.select('#country-span')
                    .append('h2')
                    .attr('id', 'complete')
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
                            d3.zoomIdentity.translate(width/2, height/2).scale(2).translate(-x, -y),
                            d3.pointer(e, svg.node())
                        );
                }
                    
                // remove country from countries & select a new one
                countries.splice(idx, 1);
    
                idx = rng(0, countries.length);
                c = countries[idx];
                instruction.text(c);
            }
        })
        .on('mouseout', function(e, d, i) {
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

    // reset counters; (elem.tot does not change!)
    score.cor = 0
    score.inc = 0
    score.gue = 0
    score.per = 0

    elem.cor.text('0');
    elem.inc.text('0');
    elem.gue.text('0');
    elem.per.text('0%');

    // reset instructions, remove completion text
    d3.select('#complete').remove();
    instruction.text('');
        
    // reset countries
    countries = all_countries;

    // pick a new country
    idx = rng(0, countries.length);
    c = countries[idx];
    instruction.text(c);
}

function zoomed({transform}) {
    d3.select('#svg-g').selectAll('path').attr('transform', transform);
    d3.select('#labels').selectAll('text').attr('transform', transform);
}
