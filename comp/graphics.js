queue()
    .defer(d3.json, "us.json")
    .defer(d3.json, "data.json")
    .await(ready);

function ready(error, us, offers) {

  offers = offers.offers;

  //Geographical Map
  var geo_width = 500,
      geo_height = 260;

  var projection = d3.geo.albersUsa().scale(geo_width)
    .translate([geo_width / 2, geo_height / 2]);

  var path = d3.geo.path().projection(projection);

  var geo_map_svg = d3.select("#geo_map").append("svg")
    .attr("width", geo_width)
    .attr("height", geo_height);

  geo_map_svg.append("path")
    .attr("class", "states")
    .datum(topojson.feature(us, us.objects.states))
    .attr("d", path);

  var offer_points = geo_map_svg.selectAll(".offer_point")
    .data(offers)
    .enter().append("g");

  offer_points.append("svg:circle")
    .attr("transform", function(d) {return "translate(" + projection(d.coordinates) + ")";})
    .attr("class", "offer_point")
    .attr('r',4.5);

  offer_points.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", function(d) {return "translate(" + projection(d.coordinates) + ")";})
    .attr("dy",-10)
    .attr("class","label")
    .text(function(d){return d.company;});

  //Pie charts
  //You know...if the "overall" category is just a weighted average of the other
  //categories, we can be more DRY but calculating it here
  var pie_side = 300;
  var pie_radius = pie_side / 2;

  var pie_col_index_min = d3.min(offers, function(offer) {
                                 return d3.min(d3.entries(offer.col),
                                               function (col_kv) { return col_kv.value; } )
                                 });
  var pie_col_index_max = d3.max(offers, function(offer) {
                                 return d3.max(d3.entries(offer.col),
                                               function (col_kv) { return col_kv.value; } )
                                 });

  var pie_radius_scale = d3.scale.linear()
    .domain([pie_col_index_min, pie_col_index_max])
    .range([0.6,1.0]);

    var pie_svgs = d3.select("#col_pie")
      .selectAll("pies")
      .data(offers).enter().append("svg")
      .attr("width", pie_side)
      .attr("height", pie_side)
      .append("g")
      .attr("transform", "translate(" + pie_radius + "," + pie_radius + ")");

    var color = d3.scale.ordinal()
      .range(colorbrewer.Blues[6]);

    var pie_arc = d3.svg.arc()
      .outerRadius(function(d,i) { return pie_radius_scale(d.data.value) * pie_radius; })
      .innerRadius(pie_radius * 0.4);

    var col_weights = d3.map({"food":13,"housing":29,"utilities":10,"transportation":12,"health":4,"misc":32});

    var pie = d3.layout.pie()
      .sort(null)
      .value(function(d) {return d.weight;});

    var pie_arc_data;
    var g = pie_svgs.selectAll(".pie_arc")
      .data(function(d,i){
            pie_arc_data = d3.map(d.col);
            pie_arc_data.remove("overall");
            pie_arc_data = d3.entries(pie_arc_data);
            pie_arc_data.map( function (ad) {
                          ad["weight"] = col_weights[ad["key"]];
                          return ad;
                          })
            return pie(pie_arc_data);
            })
      .enter().append("g")
      .attr("class", "pie_arc");

    g.append("path")
      .attr("d", pie_arc)
      .style("fill", function(d) { return color(d.value); });

    g.append("text")
      .attr("class", "pie_label_name")
      .attr("transform", function(d) { return "translate(" + pie_arc.centroid(d) + ")"; })
      .attr("dy", ".35em")
      .attr("class","arc_label")
      .style("text-anchor", "middle")
      .text(function(d) { return d.data.key ; });

    g.append("text")
      .attr("transform", function(d) { return "translate(" + pie_arc.centroid(d) + ")"; })
      .attr("dy", "1.35em")
      .attr("class","arc_label")
      .style("text-anchor", "middle")
      .text(function(d) { return " (" + d.data.value + ")";});

    pie_svgs.append("text")
      .attr("class","label")
      .style("text-anchor", "middle")
      .text(function(d) {return d.city;});

    pie_svgs.append("text")
      .attr("class","label")
      .style("text-anchor", "middle")
      .attr("dy",18)
      .text(function(d) {return d.col.overall;});

    //Dollar power bar chart
    var ATLpower = 95.6 // relative to 100 national average. this will need to be
                        // dynamically set based on users home power
    var relative_dollar_power = function (base_power, target_power, amount) {
      return (parseFloat(base_power) / parseFloat(target_power)) * parseFloat(amount);
    }

    var relative_100_ATL = function (target_power) { return relative_dollar_power(ATLpower, target_power, 100.0); };

    var dollar_power_width = 600,
        dollar_power_barHeight = 32;

    var dollar_power_max = d3.max(offers,
                                   function(offer) { return relative_100_ATL(offer.col.overall); }
                                  );

    var dollar_power_x = d3.scale.linear()
      .domain([0, dollar_power_max])
      .range([0, dollar_power_width-60]);

    var dollar_power_color_scale = d3.scale.linear()
      .domain([0, dollar_power_max])
      .range(["white","rgb(8,81,156)"]);

    var dollar_power_chart = d3.select("#dollar_power")
      .append("svg")
      .attr("width", dollar_power_width)
      .attr("height", dollar_power_barHeight * offers.length);

    var dollar_power_bars = dollar_power_chart.selectAll("g")
      .data(offers)
      .enter().append("g")
      .attr("transform", function(d, i) { return "translate(0," + i * dollar_power_barHeight + ")"; });

    dollar_power_bars.append("rect")
      .attr("width", function(d){ return dollar_power_x(relative_100_ATL(d.col.overall));})
      .attr("height", dollar_power_barHeight - 3)
      .style("fill", function(d) { return dollar_power_color_scale(relative_100_ATL(d.col.overall)); });

    var dollar_power_bar_text_margin = 3;
    dollar_power_bars.append("text")
      .attr("class","name")
      .attr("x", function(d){ return dollar_power_x(relative_100_ATL(d.col.overall)) - dollar_power_bar_text_margin;})
      .attr("y", dollar_power_barHeight / 2)
      .attr("dy", ".35em")
      .text(function(d){ return d.city;});

    dollar_power_bars.append("text")
      .attr("class","amount")
      .attr("x", function(d){ return dollar_power_x(relative_100_ATL(d.col.overall)) + dollar_power_bar_text_margin;})
      .attr("y", dollar_power_barHeight / 2)
      .attr("dy", ".35em")
      .text(function(d){ return "$"+(relative_100_ATL(d.col.overall)).toFixed(2);});

    //Weather chart
    var weather_chart_margin = {top: 20, right: 100, bottom: 30, left: 50},
        weather_chart_width_nomargin = 800,
        weather_chart_height_nomargin = 500,
        weather_chart_width = weather_chart_width_nomargin - weather_chart_margin.left - weather_chart_margin.right,
        weather_chart_height = weather_chart_height_nomargin - weather_chart_margin.top - weather_chart_margin.bottom;

    var month_fmt_str = "%b"; // abbreviated month name
    var month_format = function (i) {
        return d3.time.format(month_fmt_str)(new Date(0,i+1,0))
    };

    var weather_chart_x = d3.scale.linear()
      .domain([0, 11])
      .range([0, weather_chart_width]);

    var weather_chart_y = d3.scale.linear()
      .range([weather_chart_height, 0]);

    var weather_chart_color = d3.scale.category10();

    var weather_chart_xAxis = d3.svg.axis()
      .scale(weather_chart_x)
      .tickFormat(month_format)
      .orient("bottom");

    var weather_chart_yAxis = d3.svg.axis()
      .scale(weather_chart_y)
      .orient("left");

    var weather_chart_line = d3.svg.line()
      .interpolate("basis")
      .x(function(d) { return weather_chart_x(d.date); })
      .y(function(d) { return weather_chart_y(d.temperature); });

    var weather_chart_svg = d3.select("#weather_chart").append("svg")
      .attr("width", weather_chart_width_nomargin)
      .attr("height", weather_chart_height_nomargin)
      .append("g")
      .attr("transform", "translate(" + weather_chart_margin.left + "," + weather_chart_margin.top + ")");

    weather_chart_color.domain(offers.map(function (o) { return o.city; }));

    var cities = [], temp_obj;
    offers.forEach( function (o,i,a) {
      temp_obj = {"name":o.city, "values":[]};
      o.weather.forEach( function (value, index, arr) {
        temp_obj.values.push({
          // "date": d3.time.format("%m").parse((index+1).toString()),
          "date": index,
          "temperature": parseFloat(value)
        });
      });
      cities.push(temp_obj);
    });
    console.log(cities);

    var weather_chart_date_min = d3.min(cities, function(c) {
      return d3.min(c.values, function (v) { return v.date;});
    });
    var weather_chart_date_max = d3.max(cities, function(c) {
      return d3.max(c.values, function (v) { return v.date;});
    });

    // weather_chart_x.domain([ weather_chart_date_min, weather_chart_date_max ]);

    weather_chart_y.domain([
                           d3.min(cities, function(c) {
                             return d3.min(c.values, function(v) {
                               return v.temperature; }); }),
                           d3.max(cities, function(c) {
                             return d3.max(c.values, function(v) {
                               return v.temperature; }); })
                           ]);

    weather_chart_svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + weather_chart_height + ")")
      .call(weather_chart_xAxis);

    weather_chart_svg.append("g")
      .attr("class", "y axis axislabel")
      .call(weather_chart_yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Temperature (ºF)");

    var city = weather_chart_svg.selectAll(".city")
      .data(cities)
      .enter().append("g")
      .attr("class", "city");

    city.append("path")
      .attr("class", "line")
      .attr("d", function(d) { return weather_chart_line(d.values); })
      .style("stroke", function(d) { return weather_chart_color(d.name); });

    city.append("text")
      .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
      .attr("transform", function(d) { return "translate(" + weather_chart_x(d.value.date) + "," + weather_chart_y(d.value.temperature) + ")"; })
      .attr("x", 3)
      .attr("dy", ".35em")
      .text(function(d) { return d.name; });
}
