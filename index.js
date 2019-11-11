const fs = require('fs');
const mapshaper = require('mapshaper');
const tilebelt = require('@mapbox/tilebelt');
const _ = require('underscore');

const simplification = {
  8: 2,
  9: 5,
  10: 10,
  11: 20,
  12: 25,
  13: 30,
  14: 50,
};

Object.keys(simplification).forEach(async (z) => {
  if (!fs.existsSync(`tiles/${z}`)) fs.mkdirSync(`tiles/${z}`);
  await mapshaper.applyCommands(`-i data/tl_2019_06_tract.shp -simplify ${simplification[z]}% keep-shapes -o output.geojson`)
    .then((output) => {
      const tiles = {};
      const geo = JSON.parse(output['output.geojson'].toString());
      geo.features.forEach((f) => {
        const feature = f;
        const lat = parseFloat(feature.properties.INTPTLAT);
        const lon = parseFloat(feature.properties.INTPTLON);
        const [x, y] = tilebelt.pointToTile(lon, lat, z);
        if (!tiles[x]) tiles[x] = {};
        if (!tiles[x][y]) tiles[x][y] = [];
        feature.properties = { id: feature.properties.GEOID };
        tiles[x][y].push(feature);
      });

      _.each(tiles, (row, x) => {
        if (!fs.existsSync(`tiles/${z}/${x}`)) fs.mkdirSync(`tiles/${z}/${x}`);
        _.each(row, (tile, y) => {
          const input = {
            'input.geojson': {
              type: 'FeatureCollection',
              features: tile,
            },
          };
          mapshaper.runCommands(`-i input.geojson -o tiles/${z}/${x}/${y}.json format=topojson`, input);
        });
      });
    });
});
