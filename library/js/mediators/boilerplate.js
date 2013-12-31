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

        function pfx( str ){
            return Modernizr.prefixed( str ).replace(/([A-Z])/g, function(str,m1){ return '-' + m1.toLowerCase(); }).replace(/^ms-/,'-ms-');
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

                self.elEnergy = d3.select('#scale-left');
                self.elMass = d3.select('#scale-right');

                self.buildScale( self.elEnergy, dataEnergy );

                wrap.removeClass('loading');
            },

            buildScale : function( wrap, data ){

                var self = this
                    ,scale = d3.scale.log()
                    ,markers
                    ,vals = data.map(function( el ){
                        return el[0];
                    })
                    ,height = 3000
                    ;

                wrap.style('height', height+'px');
                scale.domain([ d3.min(vals), d3.max(vals) ]).range([0, height]);
                markers = wrap.selectAll('.marker').data( data );

                markers.enter()
                    .append('div')
                    .attr('class', 'marker')
                    .style(pfx('transform'), function( d ){ return 'translate3d(0,'+scale( d[0] )+'px, 0)'; })
                    .append('label')
                        .text(function( d ){ return d.join(': '); })
                    ;

            }

        }, ['events']);

        return new Mediator();
    }
);




