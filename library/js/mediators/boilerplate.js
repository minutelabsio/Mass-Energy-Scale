define(
    [
        'jquery'
        ,'moddef'
        ,'d3'

        ,'json!../../../data/energy.json'
        ,'json!../../../data/mass.json'
    ],
    function(
        $
        ,M
        ,d3

        ,dataEnergy
        ,dataMass
    ) {

        'use strict';

        function err( err ){
            console.error( err.toString() );
        }

        /**
         * Page-level Mediator
         * @module Boilerplate
         * @implements {Stapes}
         */
        var Mediator = M({

            /**
             * Mediator Constructor
             * @return {void}
             */
            constructor : function(){

                var self = this;
                self.initEvents();

                $(function(){
                    self.resolve('domready');
                });

                self.after('domready').then(function(){
                    self.onDomReady();
                }).otherwise( err );
            },

            /**
             * Initialize events
             * @return {void}
             */
            initEvents : function(){

                var self = this;
            },

            /**
             * DomReady Callback
             * @return {void}
             */
            onDomReady : function(){

                var self = this
                    ,wrap = $('#scale-wrap')
                    ;

                self.svgEnergy = d3.select('#scale-left').append('svg');
                self.svgMass = d3.select('#scale-right').append('svg');

                self.buildScale( self.svgEnergy, dataEnergy );

                wrap.removeClass('loading');
            },

            buildScale : function( svg, data ){

                var self = this
                    ,scale = d3.scale.log()
                    ,markers
                    ,vals = data.map(function( el ){
                        return el[0];
                    })
                    ,height = 2000
                    ;

                svg.attr('height', height);
                scale.domain([ d3.min(vals), d3.max(vals) ]).range([0, height]);
                markers = svg.selectAll('.marker').data( data );

                markers.enter()
                    .append('g')
                    .attr('class', 'marker')
                    .attr('height', 40)
                    .attr('transform', function( d ){ return 'translate(0,'+scale( d[0] )+')'; })
                    .append('text')
                        .text(function( d ){ return d.join(': '); })
                    ;

            }

        }, ['events']);

        return new Mediator();
    }
);




