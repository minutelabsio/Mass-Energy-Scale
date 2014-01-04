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

        function log10(val) {
            return Math.log(val) / Math.LN10;
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

                self.min = 1e-23;
                self.max = 1e-8;
                self.height = 3000;
                self.axisOffset = 30;

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
                    ,wrap = $('#scale-wrap').height(self.height)
                    ,scaleEnergy = d3.scale.log()
                        .domain([ self.min, self.max ])
                        .range([0, self.height])
                    ,scaleMass = d3.scale.log()
                        .domain([ self.min * 1.11265006e-17, self.max * 1.11265006e-17 ])
                        .range([0, self.height])
                    ;

                self.wrap = wrap;
                self.scaleEnergy = scaleEnergy;
                self.scaleMass = scaleMass;

                self.elEnergy = d3.select('#scale-left');
                self.elMass = d3.select('#scale-right');

                self.placeAxis( self.elEnergy, scaleEnergy, 'left' );
                self.placeAxis( self.elMass, scaleMass, 'right' );

                self.placeMarkers( self.elEnergy, dataEnergy, scaleEnergy );
                self.placeMarkers( self.elMass, dataMass, scaleMass );

                self.initControls();
                self.initExplanations();

                wrap.removeClass('loading');
            },

            initExplanations: function(){

                var self = this
                    ,$expl = $('#explanations').appendTo('#wrap-outer')
                    ,before = []
                    ,inside = []
                    ,after = []
                    ,sortExitDec = function(a, b){
                        return -(a.exit - b.exit);
                    }
                    ,sortExitAsc = function(a, b){
                        return (a.exit - b.exit);
                    }
                    ,sortEnterAsc = function(a, b){
                        return (a.enter - b.enter);
                    }
                    ;

                $expl.find('section').each(function(){

                    var $this = $(this)
                        ,enter = $this.data('enter')
                        ,exit = $this.data('exit')
                        ,data = {
                            enter: enter|0
                            ,exit: exit|0
                            ,el: $this
                        }
                        ;

                    if (!enter){
                        $this.addClass('on');
                        inside.push( data );
                    } else {
                        before.push( data );
                    }
                });

                $(window).on('scroll', function(){
                    var pos = Math.max($(this).scrollTop(), 0)
                        ,i
                        ,l
                        ;

                    for ( i = 0, l = before.length; i < l; ++i ){
                        
                        if ( pos >= before[ i ].enter ){
                            before[ i ].el.addClass('on');
                            inside.push( before.shift() );
                            l--;
                            i--;
                        } else {
                            break;
                        }
                    }

                    for ( i = 0, l = after.length; i < l; ++i ){
                        
                        if ( pos < after[ i ].exit ){
                            after[ i ].el.addClass('on');
                            inside.push( after.shift() );
                            l--;
                            i--;
                        } else {
                            break;
                        }
                    }

                    inside.sort(sortEnterAsc);

                    for ( i = 0, l = inside.length; i < l; ++i ){
                        
                        if ( pos > inside[ i ].exit ){
                            inside[ i ].el.removeClass('on');
                            after.push( inside.shift() );
                            l--;
                            i--;
                        } else if ( pos < inside[ i ].enter ){
                            inside[ i ].el.removeClass('on');
                            before.push( inside.shift() );
                            l--;
                            i--;
                        }
                    }

                    after.sort(sortExitDec);
                    before.sort(sortEnterAsc);
                });
            },

            initControls: function(){
                var self = this
                    ,$mid = $('#middle').appendTo('#wrap-outer')
                    ,$inputEnergy = $mid.find('.energy-controls input')
                    ,$inputMass = $mid.find('.mass-controls input')
                    ,$win = $(window)
                    ,fudge = $mid.height()/2 + $mid.offset().top - self.axisOffset - self.wrap.offset().top
                    ,format = d3.format('.2e')
                    ,scaleEnergy = self.scaleEnergy
                    ,scaleMass = self.scaleMass
                    ,to
                    ,disable
                    ;

                $(window).on('scroll', function(){
                    if (disable){
                        return;
                    }

                    var scroll = $win.scrollTop() + fudge;
                    if ( scroll > 0 ){
                        $mid.removeClass('outside');
                        $inputEnergy.val( format(scaleEnergy.invert(scroll)) );
                        $inputMass.val( format(scaleMass.invert(scroll)) );
                    } else {
                        $inputEnergy.val('');
                        $inputMass.val('')
                        $mid.addClass('outside');
                    }
                });

                function scrollTo(){
                    var $this = $(this)
                        ,val = $this.val()
                        ,scale = $this.is($inputEnergy) ? scaleEnergy : scaleMass
                        ,pos = scale( val ) - fudge
                        ;
                    
                    if (pos && pos > 0){
                        disable = true;
                        $('body').animate({
                            scrollTop: pos
                        }, {
                            duration: 500,
                            complete: function(){
                                disable = false;
                                $(window).trigger('scroll');
                            }
                        });
                    }
                }

                $(document).on('keyup', '#middle input[type="text"]', function(){
                    clearTimeout(to);
                    to = setTimeout(scrollTo.bind(this), 1000);
                });
            },

            placeAxis : function( el, scale, orientation ){

                var self = this
                    ,svg = el.append('svg')
                    ,axis = d3.svg.axis()
                    ,width = 100
                    ,domain = scale.domain()
                    ;

                axis.scale( scale )
                    .orient( orientation || 'left' )
                    .tickFormat( function(n){
                        return (n / Math.pow(10, Math.floor(log10(n))) - 1) < 0.00001 ? Math.round(log10(n)) : '';
                    })
                    .innerTickSize( 4 )
                    // .outerTickSize( 20 )
                    ;
                svg.attr('class', 'axis')
                    .attr('width', width)
                    .attr('height', scale.range()[1])
                    .append('g')
                    .attr('transform', 'translate('+ (orientation === 'left' ? width - 1 : 1) +','+self.axisOffset+')')
                    .call( axis )
                    ;


            },

            placeMarkers : function( wrap, data, scale ){

                var self = this
                    ,markers
                    ,vals = data.map(function( el ){
                        return el[0];
                    })
                    ;

                
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




