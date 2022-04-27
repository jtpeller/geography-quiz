// =================================================================
// = main.js
// =    Description : implements the geography quiz
// =    Date        : April 25, 2022
// =    Author      : jtpeller
// =================================================================

// ids holds all the HTML ID tags for d3 to use
let ids = {
    left: '#left',
    right: '#right',
    svg: '#svg',
    controls: '#controls',
    continent: '#continent-dropdown',
    userscore: '#userscore',
    totalscore: '#totalscore'
};

let left, right, svg, controls, select, instruction,
    userscore, totalscore, percent;
let map;

let regions = [
    "Africa", "Asia", "Europe", "North America", 
    "Oceania", "South America"
]

let countries = [];

// svg dims
let width, height;  // defined in init
let margin = {top: 10, left: 10, right: 10, bottom: 10};
let innerwidth, innerheight; // defined in init

//
// init page on load
//
document.addEventListener('DOMContentLoaded', function() {
    // set IDs, get d3 lets, etc.
    left = d3.select(ids.left);
    right = d3.select(ids.right);

    controls = left.append('div')
        .attr('id', ids.controls);
    svg = right.append('svg');

    // initialize the webpage
    init();
})


function init() {
    // first, add everything possible without loading the data
    // this makes it sure that it's nice and snappy (and I don't load ~20MB of data)

    // dropdown for selecting which continent
    var div = controls.append('div')
        .classed('form-group', true);

    div.append('label')
        .attr('for', ids.continent)
        .classed('form-label my-label', true)
        .text('Select the region:');

    div.append('br')
    select = div.append('select')
        .classed('form-select', true)
        .attr('id', ids.continent);
    
    // add the options for the dropdown
    for (let i = 0; i < regions.length; i++) {
        select.append('option')
            .attr('value', regions[i].replaceAll(' ', '_'))
            .text(regions[i]);
    }

    controls.append('hr');

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

    var headerrow = scoretable.append('thead').append('tr')
    headerrow.append('th').attr('scope', 'col').text('Correct')
    headerrow.append('th').attr('scope', 'col').text('Incorrect')
    headerrow.append('th').attr('scope', 'col').text('Guesses')
    headerrow.append('th').attr('scope', 'col').text('Total')
    headerrow.append('th').attr('scope', 'col').text('% Correct');

    var body = scoretable.append('tbody').append('tr')
    userscore = body.append('td').text('0')
    wrongscore = body.append('td').text('0')
    totalguess = body.append('td').text('0')
    totalscore = body.append('td').text('0')
    percent = body.append('td').text('0%')

    // add a reset button and some other stuff
    controls.append('hr');
    controls.append('button')
        .classed('btn btn-outline-light', true)
        .text('Restart')
        .on('click', function() {
            // reset all counters, reset all map
            d3.selectAll('.map').classed('correct incorrect', false)
            userscore.text('0')
            wrongscore.text('0')
            totalguess.text('0')
            totalscore.text('0')

            initMap();
        })

    // then, parse in the data. default to Africa
    // and call draw map and whatnot
    select.on('input', initMap);
    select.dispatch('input');
}

function initMap() {
    // reset all counters, reset all map
    d3.selectAll('.map').classed('correct incorrect', false)
    userscore.text('0')
    wrongscore.text('0')
    totalguess.text('0')
    totalscore.text('0')
    
    // get the current map
    let selected = select.property('value');
        
    // svg inits
    width = +svg.style('width').replace('px', '');
    height = +svg.style('height').replace('px', '');
    innerwidth = width - margin.left - margin.right;
    innerheight = height - margin.top - margin.bottom;

    // promise data
    Promise.all([
        d3.json(`data/continents/${selected}.geojson`)
    ]).then(function(values) {
        svg.html('');       // we're drawing the map, so make sure it's empty.
        drawMap(values[0], selected);
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

    let g = svg.append('g');
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
            } else {        // otherwise, continue the quiz
                // remove country from countries & select a new one
                countries.splice(idx, 1);
    
                idx = rng(0, countries.length);
                instruction.text(c);
            }

            // add the label for the correct country
            var coords = getCoords(geojson, c);
            labels.append('text')
                .text(c)
                .attr('text-anchor', 'middle')
                .attr('x', coords[0])
                .attr('y', coords[1]);
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
            .precision(0.1);
    } else if (continent == 'North_America') {
        return d3.geoNaturalEarth1()
            .rotate([14, 0])
            .fitSize([innerwidth, innerheight], geojson)
            .precision(0.1);
    } else if (continent == 'Oceania') {
        return d3.geoEquirectangular()
            .rotate([160, 0])
            .fitSize([innerwidth, innerheight], geojson)
            .precision(0.1);
    } else if (continent == 'South_America') {
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