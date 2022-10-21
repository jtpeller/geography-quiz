// =================================================================
// = main.js
// =    Description : implements the geography quiz
// =    Date        : April 25, 2022
// =    Author      : jtpeller
// =================================================================

// ids holds all the HTML ID tags for d3 to use
let ids = {
    userscore: '#userscore',
    totalscore: '#totalscore'
};

let header, content;

let left, right, title, svg, controls, select, instruction,
    userscore, totalscore, percent, reset_zoom, zoom;
let map;

const dur = 500;

let countries = [];

// svg dims
let width, height;  // defined in init
let margin = {top: 10, left: 10, right: 10, bottom: 10};
let innerwidth, innerheight; // defined in init

let region;

//
// init page on load
//
document.addEventListener('DOMContentLoaded', function() {
    // set IDs, get d3 lets, etc.
    header = d3.select('#header');
    content = d3.select('#content')
        .classed('container', true);

    title = content.append('h2')
        .classed('title', true)

    var rowdiv = content.append('div')
        .classed('row flex-center', true);
    
    left = rowdiv.append('div')
        .attr('id', 'left')
        .classed('col-4', true);

    right = rowdiv.append('div')
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
    
    // get country & its index
    region = location.search.replace('?', '').replace('%20', ' ');
    var idx = regions.indexOf(region);

    title.text(`${region} Quiz`)

    // initialize navbar
    initNavbar(header, idx);

    // add the title banner thing

    // add the instruction (tells user which country to click on)
    let section = controls.append('section')
        .classed('text-center', true)
    section.append('h2')
        .text('Click on:');

    instruction = section.append('h3')
        .classed('country-select', true)
        .text('');

    // add the score
    controls.append('hr');
    let score = controls.append('section')
        .classed('text-center', true)
    
    var div = score.append('div')
        .classed('row', true);

    var scoretable = div.append('table')
        .classed('table table-dark', true);

    var headers = ["Correct", "Incorrect", "Guesses", "Total", "% Correct"];

    var headerrow = scoretable.append('thead').append('tr');

    for (var i = 0; i < headers.length; i++) {
        headerrow.append('th').attr('scope', 'col').text(headers[i])
    }

    var body = scoretable.append('tbody').append('tr');
    userscore = body.append('td').text('0');
    wrongscore = body.append('td').text('0');
    totalguess = body.append('td').text('0');
    totalscore = body.append('td').text('0');
    percent = body.append('td').text('0%');

    // zoom setup
    zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on('zoom', function() {
            d3.select('#svg-g').selectAll('path').attr('transform', d3.event.transform);
            d3.select('#labels').selectAll('text').attr('transform', d3.event.transform);
        });

    // add a reset_zoom button
    reset_zoom = controls.append('button')
        .classed('btn site-btn', true)
        .style('width', '100%')
        .text('Reset Zoom')
        .on('click', function() {
            svg.transition().duration(dur).call(zoom.transform, d3.zoomIdentity);
        })

    reset_zoom.dispatch('click');
    svg.call(zoom)                      // establish zoom behavior
        .on('dblclick.zoom', function() {
            svg.transition().duration(dur).call(zoom.transform, d3.zoomIdentity);
        });     // no dbl click to zoom

    // add a reset button and some other stuff
    controls.append('hr');
    controls.append('button')
        .classed('btn site-btn', true)
        .style('width', '100%')
        .text('Restart')
        .on('click', function() {
            // reset all counters, reset all map
            resetCounters();

            d3.select('#finished').style('opacity', 0);

            initMap();
        })

    controls.append('span')
        .attr('id', 'finished')
        .html(' &#8592; You finished! Click here to restart the quiz!')
        .style('opacity', 0);

    // initialize the map last
    initMap();
}

function initMap() {
    // reset all counters, reset all map
    resetCounters();
        
    // svg inits
    width = +svg.style('width').replace('px', '');
    height = +svg.style('height').replace('px', '');
    innerwidth = width - margin.left - margin.right;
    innerheight = height - margin.top - margin.bottom;

    // promise data
    Promise.all([
        d3.json(`data/continents/${region.replace(' ', '_')}.geojson`)
    ]).then(function(values) {
        svg.html('');       // we're drawing the map, so make sure it's empty.
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
    
    // then, randomly pick a country and set instruction
    let idx = rng(0, countries.length)
    instruction.text(countries[idx])
    totalscore.text(countries.length)

    let g = svg.append('g').attr('id', 'svg-g');
    let labels = svg.append('g')
        .attr('id', 'labels');
    
    // add the map
    map = g.selectAll('.map')
        .data(geojson.features)
        .join('path')
        .attr('d', geogen)
        .classed('map', true)
        .attr('fill', 'rgb(221, 203, 180)')
        .attr('id', function(d) { return d.properties.name_long.replaceAll(' ', '_').replaceAll('.', ''); })
        .on('mouseover', function(d, i) {
            d3.select(this).classed('highlighted', true);
        })
        .on('click', function(d, i) {
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

            // if user is finished, finalize the map
            if (+totalguess.text() >= +totalscore.text()) {
                // remove click listener (user is done)
                d3.selectAll('.map').on('click', null);

                d3.select('#finished').style('opacity', 1); // make it visible

            } else {        // otherwise, continue the quiz
                // add the label for the correct country
                var coords = getCoords(geojson, c);
                labels.append('text')
                    .text(c)
                    .attr('text-anchor', 'middle')
                    .attr('x', coords[0])
                    .attr('y', coords[1])

                // zoom into/center on the correct country
                var x = coords[0], y = coords[1];
                svg.transition().duration(dur)
                    .call(
                        zoom.transform,
                        d3.zoomIdentity.translate(width/2, height/2).scale(2).translate(-x, -y)
                    );
                
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

/**
 * resets the map and counters for a new quiz
 */
function resetCounters() {
    d3.selectAll('.map').classed('correct incorrect', false);
    userscore.text('0');
    wrongscore.text('0');
    totalguess.text('0');
    totalscore.text('0');
    percent.text('0');
}