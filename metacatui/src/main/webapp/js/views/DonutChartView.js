/*global define */
define(['jquery', 'underscore', 'backbone', 'd3'], 				
	function($, _, Backbone, d3) {
	'use strict';
		
	// Build the main header view of the application
	var DonutChartView = Backbone.View.extend({

		initialize: function (options) {
			
			/*  -- Options for creating donut charts --
			 *  id of the SVG element to be created
		 	 *  data: array of formatID names followed by their count, identical to Solr facet format. e.g. ["text/CSV", 10, "text", 20]
			 * total: total count for this donut chart (used to calculate percentages)
			 * colors: an array of colors (strings of hex code) for the arcs 
			 * titleText (optional): A string to insert in the center of the donut 
			 * titleCount (optional): A number to insert in the center of the donut
			 * height: height of SVG element
			 * width: width of SVG element
			 * svgClass: class to give the parent svg element
			 */
			
			//Give all the specified options to this view
			this.id 		= options.id 		 || "chart";
			this.colors 	= options.colors 	 || ["#000000"];
			this.titleText  = options.titleText  || "";
			this.titleCount = options.titleCount || 0;
			this.height 	= options.height	 || 300;
			this.width		= options.width		 || 500;
			this.svgClass	= options.svgClass	 || "";
			this.total		= options.total		 || 0;
			if(typeof options.data !== undefined){
				this.data = this.formatDonutData(options.data, options.total);
			}
			else{
				this.data = [{label: "", count: 0, perc: 0}];
			};

		},
		
		// http://stackoverflow.com/questions/9651167/svg-not-rendering-properly-as-a-backbone-view
		// Give our el a svg namespace because Backbone gives a different one automatically
		nameSpace: "http://www.w3.org/2000/svg",
		  _ensureElement: function() {
		     if (!this.el) {
		        var attrs = _.extend({}, _.result(this, 'attributes'));
		        if (this.id) attrs.id = _.result(this, 'id');
		        if (this.className) attrs['class'] = _.result(this, 'className');
		        var $el = $(window.document.createElementNS(_.result(this, 'nameSpace'), _.result(this, 'tagName'))).attr(attrs);
		        this.setElement($el, false);
		     } else {
		        this.setElement(_.result(this, 'el'), false);
		     }
		 },
				
		tagName: "svg",
						
		render: function () {			
			console.log('Rendering a donut chart');
			
			var viewRef = this;				
			
	        /*
	         * ========================================================================
	         * Gather and create preliminary data for our donut chart
	         * ========================================================================
	         */
			
			//Reiterate over the colors if there aren't enough specified for each arc
			var i = 0;
			while(this.colors.length < this.data.length){
				this.colors.push(this.colors[i]);
				i++;
			}
	
			//Set up the attributes for our donut chart
	        var w = this.width,
	            h = this.height,
	            lastX = 0,
	            lastY = 0,
	            lastWidth = 0,
	            r = Math.min(w, h) / 4,
	            labelr = r*1.3, // radius for label anchor
	            donut = d3.layout.pie(),
	            arc = d3.svg.arc().innerRadius(r * .80).outerRadius(r);
	        
	        //Select the SVG element and connect our data to it
	        var vis = d3.select(this.el)
	        			.attr("class", "donut " + this.svgClass)
	        			.data([viewRef.data]);
	        
	        /*
	         * ========================================================================
	         * Draw the arcs
	         * ========================================================================
	         */

	        //Set up a group for each arc we will create
	        var arcs = vis.selectAll("g.arc")
	            .data(donut.value(function(d) { return d.perc })) //connect data to this group 
	            .enter().append("svg:g") 
	            .attr("class", "donut-arc-group")
	            .attr("transform",
					"translate(" + w/2 + ", " + h/2 + ")"); //center in the SVG element

	        //Append an arc to each group
	        arcs.append("svg:path")
	        	.attr("class", "donut-arc")
	            .attr("fill", function(d, i) { return viewRef.colors[i]; })
	            .attr("d", arc);
	        
	        /*
	         * ========================================================================
	         * Add labels next to each arc
	         * ========================================================================
	         */

	        //Append a group to each arc group to contain the labels
	        var labelGroups = arcs.append("svg:g")
        						  .attr("class", "donut-labels");
	        
	        //Keep track of how many labels we rotate
	        var rotatedLabels = [],
	        	rotatedCounts = [],
	        	rotateWidth = .5; //The max arc width/length to attach straight labels to. Anything under this gets rotated.
	        
	        // Append a text label to each arc
        	labelGroups.append("svg:text")
        				.attr("transform", function(d, i) { //Calculate the label position based on arc centroid
	                var c = arc.centroid(d),
	                    x = c[0],
	                    y = c[1],
	                    h = Math.sqrt(x*x + y*y), // pythagorean theorem for hypotenuse
	                    width = d.endAngle - d.startAngle;
	                
	                    this.transformX = (x/h * labelr);
	                    this.transformY = (y/h * labelr);
	                    var transform = "translate(" + (this.transformX+5) + "," + this.transformY +  ")";
	                
	                //Rotate the labels if the arc width is below a certain threshold
	                if(width < rotateWidth){
	                	transform = "translate(" + this.transformX +  ',' + (this.transformY + 10) +  ") rotate(40)";
	                	rotatedLabels.push(this);
	                }
	               	                
	                return transform; 
	            })
	        	.attr("class", "donut-arc-label")
	            .attr("fill", function(d, i){ return viewRef.colors[i]; })
	            .attr("text-anchor", function(d) {
	                // are we past the center?
	                return (d.endAngle + d.startAngle)/2 > Math.PI ?
	                    "end" : "start";
	            })
	            .text(function(d, i) { 
	            	return d.data.label; 
	            });
        	
        	// Append a count label next to each arc
	        var countLabels = labelGroups.append("svg:text");
	        
	        countLabels.attr("class", "donut-arc-count")
	            .attr("text-anchor", function(d) {
	                // are we past the center?
	                return (d.endAngle + d.startAngle)/2 > Math.PI ?
	                    "end" : "start";
	            })
	            .text(function(d, i) { 	         
	            	return viewRef.commaSeparateNumber(d.data.count); 
	            })
	           .attr("transform", function(d, i) { //Calculate the label position based on arc centroid
	                var c = arc.centroid(d),
	                    x = c[0],
	                    y = c[1],
	                    h = Math.sqrt(x*x + y*y), // pythagorean theorem for hypotenuse
	                    width = d.endAngle - d.startAngle;
	                
	                    this.transformX = (x/h * labelr);
	                    this.transformY = (y/h * labelr); 
	                    var transform = "translate(" + (this.transformX + 5) +  ',' + (this.transformY + 20) +  ")"; 
                    
	                // Again, if the arc is below a certain width, we will rotate it. Just move down and to the left a bit to align it with its corresponding label 
	                if(width < rotateWidth){
	                	transform = "translate(" + (this.transformX-10) +  ',' + (this.transformY+20) +  ") rotate(40)";
	                	
	                	rotatedCounts.push(this);
	                	
	                	//Give it a rotated class for special styling
		                var classes = d3.select(this).attr("class");	                
		                d3.select(this).attr("class", classes + " rotated");
	                }
	                	                
	                return transform; 
	            });
	        
	        //If there is only one rotated label in the whole donut chart, we can safely assume this doesn't need to be rotated. So "un-rotate" it
        	if(rotatedLabels.length == 1) d3.select(rotatedLabels[0]).attr("transform", "translate(" + (rotatedLabels[0].transformX + 5) + "," +  rotatedLabels[0].transformY 		+ ")");
        	if(rotatedCounts.length == 1){
        		d3.select(rotatedCounts[0]).attr("transform", "translate(" +  rotatedCounts[0].transformX 	 + "," + (rotatedCounts[0].transformY + 20) + ")");
        		
        		var classes = d3.select(rotatedCounts[0]).attr("class");	                
                d3.select(rotatedCounts[0]).attr("class", classes.replace("rotated", ""));
        	}

	        /*
	         * ========================================================================
	         * Add the title to the center of the donut chart
	         * ========================================================================
	         */
        	//Check if a title was sent in the first place
	        if((this.titleText || (this.titleText !== undefined)) && (this.titleCount || (this.titleCount !== undefined))){
		        //Add the data count in text inside the circle
	        	var textData = [];
	        	
	        	// If we were given a count to display,
	        	if(this.titleCount || (this.titleCount !== undefined)){
	        		textData.push({
									"cx" : w/2,  //Start at the center
									"cy" : h/2, //Start at the center
									"text" : this.commaSeparateNumber(this.titleCount),
									"className" : "donut-title-count"
								});
	        	}
	        	//If we were given a text title to display,
	        	if(this.titleText || (this.titleText !== undefined)){
	        		textData.push({
									"cx" : w/2,  //Start at the center
									"cy" : h/2, //Start at the center
									"text" : this.titleText,
									"className" : "donut-title-text"
								});
	        	}
				
	        	// Draw the count in the SVG element
				var count = vis.append("svg:g")
								.selectAll("text")
							   .data(textData)
							   .enter().append('svg:text');
	
				// Give the count title some attributes for styling and identification
				var attributes = count
							.text(function(d){ return d.text; })
							.attr("id", function(d){ return d.id; })
							.attr("class", function(d){ return d.className; })
							.attr("x", function(d, i){ return d.cx  }) 
							.attr("y", function(d, i){ 
											//Center vertically based on the height
											if(i > 0){
												return d.cy + 12;
											}
											else{
												return d.cy - 12;
											}
							})
							.attr("text-anchor", "middle")
							.attr(function(d){  return "transform", "translate(" + d.cx + "," + d.cy + ")" });
	        }
	        
	        /*
	         * ========================================================================
	         * Add event listeners to the arcs 
	         * ========================================================================
	         */
	        
	        // We will need to add event listeners here instead of using the Backbone event handler because we
	        // are dynamically creating our SVG element
	        // jQuery class selectors don't work on SVG elements so we are going to do this in a round-about way
	        var arcs = this.$el.find('[class=donut-arc]');
	        $(arcs).mouseover(function(e){
				 var arc = e.target;
				 
				//Toggle the inactive/active class for all arcs in this chart
				 $(arc).parents("svg").each(function(i, svg){
					 
					//Select all elements with donut-arc class attribute
					$(svg).find("[class~=donut-arc]").each(function(i, otherArc){
						//Get the current classes
						var classes = $(otherArc).attr("class");
						 
						if(otherArc == arc){
							 // add the active class				 
							 $(arc).attr("class", classes + " active");
						}
						else{
							// add the 'inactive' class
							$(otherArc).attr("class", classes + " inactive");
						}
					});
					
				 });
	        });
	        
	        $(arcs).mouseout(function(e){
				 var arc = e.target;
				 
				//Toggle the inactive/active class for all arcs in this chart
				 $(arc).parents("svg").each(function(i, svg){
					 
					//Select all elements with donut-arc class attribute
					$(svg).find("[class~=donut-arc]").each(function(i, otherArc){
						//Get the current classes
						var classes = $(otherArc).attr("class");
						 
						//remove either "active" or "inactive" class names
						classes = classes.replace("inactive", "")
										 .replace("active", "");
						
						$(otherArc).attr("class", classes);
					});
					
				 });
	        });
	        
	        	        	 	        
			return this;
	
		},
		
		//** This function will loop through the raw facet counts response array from Solr and returns
		//   a new array of objects that are in the format needed to draw a donut chart
		// Format of data output:
		//		  label: formatID from array given	perc: percentage of total	count: count from array given
		//		[{label: "Format ID", perc: .50, count: 20}]
		// param counts: array of formatID names followed by their count, identical to Solr facet format. e.g. ["text/CSV", 10, "text", 20]
		formatDonutData: function(counts){
			var newArray = [];
			var otherPercent = 0;
			var otherCount = 0;
			
			for(var i=1; i<=counts.length; i+=2){
				if(counts[i]/this.total < .02){
					otherPercent += counts[i]/this.total;
					otherCount   += counts[i];
				}
				else{
					var name = counts[i-1];
					if((name !== undefined) && (name.indexOf("eml://ecoinformatics.org") > -1) && (name.indexOf("eml") > -1)){
						//Get the EML version only
						name = name.substr(name.lastIndexOf("/")+1).toUpperCase().replace('-', ' ');
					}
					if((this.total == 0) && (counts[i] == 0)){
						var perc = 1;
					}
					else{
						var perc = counts[i]/this.total;
					}
					newArray.push({label: name, perc: perc, count:counts[i]});
				}
			}
			
			if(otherCount > 0){
				newArray.push({label: "Other", perc: otherPercent, count: otherCount});
			}
			
			return newArray.sort(function(obj1, obj2){
				return obj1.count - obj2.count;
			});
			
			//return newArray;
		},
		
		//Function to add commas to large numbers
		commaSeparateNumber: function(val){
		    while (/(\d+)(\d{3})/.test(val.toString())){
		      val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
		    }
		    return val;
		 }
		
	});
	return DonutChartView;		
});