define(
    [
        'jquery'
        ,'moddef'
        ,'d3'
        ,'iscroll'

        ,'json!../../../data/energy.json'
        ,'json!../../../data/mass.json'
    ],
    function(
        $
        ,M
        ,d3
        ,IScroll

        ,dataEnergy
        ,dataMass
    ) {

        'use strict';

        function sortData( a, b ){
            return a[0] - b[0];
        }

        dataEnergy.sort( sortData );
        dataMass.sort( sortData );

        function err( err ){
            console.error( err.toString() );
        }

        function pfx( str ){
            return Modernizr.prefixed( str ).replace(/([A-Z])/g, function(str,m1){ return '-' + m1.toLowerCase(); }).replace(/^ms-/,'-ms-');
        }

        function log10(val) {
            return Math.log(val) / Math.LN10;
        }

        function throttle( fn, delay ){
            var to
                ,cb = function(){
                    to = null;
                    fn();
                }
                ;
            return function(){
                if ( !to ){
                    to = setTimeout( cb, delay );
                }
            };
        }

        function getNearest( data, val ){
            var last = Infinity
                ,diff
                ;
            for ( var i = 0, l = data.length; i < l; ++i ){
                diff = Math.abs( val - data[ i ][ 0 ] );
                
                if ( diff > last ){
                    if ( last/val > 0.7 ){
                        return -1;
                    }
                    return i - 1;
                }
                last = diff;
            }
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

                self.min = 1e-20;
                self.max = 1e49;
                self.height = 16000;
                self.axisOffset = 30;
                self.scaleFactor = false;

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
                    ,$win = $(window)
                    ,wrap = $('#scale-wrap').height(self.height)
                    ,$eqn = $('#equation')
                    ,$bgs = $('<div/><div/><div/><div/>').addClass('star-bg').appendTo($('<div>').addClass('bgs-wrap').appendTo('#wrap-outer'))
                    ,bgCuttoff = 3300
                    ,scaleEnergy = d3.scale.log()
                        .domain([ self.min, self.max ])
                        .range([0, self.height])
                        .clamp( true )
                    ,scaleMass = d3.scale.log()
                        .domain([ self.min * 1.11265006e-17, self.max * 1.11265006e-17 ])
                        .range([0, self.height])
                        .clamp( true )
                    ,s
                    ;

                $bgs.each(function( i ){
                    $(this).addClass( 'bg-'+i );
                });

                if ( Modernizr.touch ){
                    self.scroller = new IScroll('#wrap-outer', { mouseWheel: true, probeType: 3, tap: true });
                } 

                // init scroll event
                if ( self.scroller ){
                    self.scroller.on('scroll', function(){
                        self.emit('scroll', -self.scroller.y);
                    });
                } else {
                    $win.on('scroll', function(){
                        self.emit('scroll', $win.scrollTop());
                    });
                }

                // backgrounds
                self.on('scroll', function( e, scroll ){

                    if ( scroll < bgCuttoff  ){
                        $bgs.fadeIn('slow');
                    } else {
                        $bgs.fadeOut('slow');
                    }
                    
                    $bgs.each(function( i ){
                        var pos = -scroll * Math.sqrt(i+0.5) * 0.5;
                        $(this).css('transform', 'translate3d(0,'+pos+'px,0)');
                    });
                });

                // resizing
                $win.on('resize', function(){
                    var margin;
                    var scale = ( $win.width() < 1020 ) ? 0.7 : 1;

                    if ( scale !== self.scaleFactor ){
                        self.scaleFactor = scale;

                        margin = wrap.height() * (scale - 1) * 0.5 + $win.height() - 442;
                        wrap.css('margin-bottom', margin | 0);
                    }
                }).trigger('resize');

                self.wrap = wrap;
                self.scaleEnergy = scaleEnergy;
                self.scaleMass = scaleMass;

                self.elEnergy = d3.select('#scale-left');
                self.elMass = d3.select('#scale-right');

                self.axisEnergy = self.placeAxis( self.elEnergy, scaleEnergy, 'left' );
                self.axisMass = self.placeAxis( self.elMass, scaleMass, 'right' );

                self.placeMarkers( self.elEnergy, dataEnergy, scaleEnergy, 'energy-' );
                self.placeMarkers( self.elMass, dataMass, scaleMass, 'mass-' );

                // fix scrolling issues on reload
                s = $win.scrollTop();
                $win.scrollTop( 0 );
                self.initControls();
                self.initExplanations();
                $('#small-screen-msg').appendTo('#wrap-outer');

                self.niceLoad(function(){
                    $('body').removeClass('loading');
                    $win.scrollTop( s );
                });

                var scrTimer;
                self.on('scroll', function(){
                    clearTimeout(scrTimer);
                    wrap.addClass('scrolling');
                    scrTimer = setTimeout(function(){
                        wrap.removeClass('scrolling');
                    }, 400);
                });
            },

            niceLoad: function( fn ){
                var t = window.performance && window.performance.timing;
                if ( t && (t.domComplete - t.responseEnd) < 1000 ){
                    setTimeout(fn, 1000);
                } else {
                    fn();
                }
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

                $(document).on('click', '#next-btn', function( e ){

                    var next = before[ 0 ]
                        ,pos
                        ;

                    if ( next ){
                        pos = next.enter + 5;
                    } else {
                        pos = $('#scale-wrap').offset().top - 300;
                    }

                    if ( self.scroller ){

                        self.scroller.scrollBy(0, -pos, 500);
                    } else {

                        $('body').animate({
                            scrollTop: pos
                        }, {
                            duration: 500,
                            complete: function(){
                                $(window).trigger('scroll');
                            }
                        });
                    }
                });

                self.on('scroll', function ( e, scr ){
                    
                    var pos = Math.max(scr, 0)
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
                            after.push( inside[ i ] );
                            inside.splice(i, 1);
                            l--;
                            i--;
                        } else if ( pos < inside[ i ].enter ){
                            inside[ i ].el.removeClass('on');
                            before.push( inside[ i ] );
                            inside.splice(i, 1);
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
                    ,$headings = $('#headings').appendTo('#wrap-outer')
                    ,$inputEnergy = $mid.find('.energy-controls .input')
                    ,$inputMass = $mid.find('.mass-controls .input')
                    ,$win = $(window)
                    ,fudge = $mid.height()/2 + $mid.offset().top - self.axisOffset - self.wrap.offset().top
                    ,format = d3.format('.2e')
                    ,to
                    ,disable
                    ,$markersEnergy = $('#scale-left .marker')
                    ,$markersMass = $('#scale-right .marker')
                    ,idxE
                    ,idxM
                    ;

                var highlightNearest = throttle(function(){
                    $markersEnergy.removeClass('highlight')
                        .eq( idxE )
                        .addClass('highlight')
                        ;

                    $markersMass.removeClass('highlight')
                        .eq( idxM )
                        .addClass('highlight')
                        ;
                }, 100);

                self.on('scroll', function ( e, scr ){
                    if (disable){
                        return;
                    }

                    var scroll = (scr + fudge - $mid.height() * (1-self.scaleFactor) * 0.4) / self.scaleFactor
                        ,val
                        ;
                    
                    if ( scroll > 0 ){
                        $mid.removeClass('outside');
                        $headings.removeClass('outside');

                        val = self.scaleEnergy.invert(scroll);
                        idxE = getNearest(dataEnergy, val);
                        val = format(val).split('e');
                        $inputEnergy.find('.meter').val( val[ 0 ] );
                        $inputEnergy.find('.mag').val( val[ 1 ] );

                        val = self.scaleMass.invert(scroll);
                        idxM = getNearest(dataMass, val);
                        val = format(val).split('e');
                        $inputMass.find('.meter').val( val[ 0 ] );
                        $inputMass.find('.mag').val( val[ 1 ] );

                        highlightNearest();

                    } else {
                        $inputEnergy.find('input').val('');
                        $inputMass.find('input').val('');
                        $mid.addClass('outside');
                        $headings.addClass('outside');
                    }

                    if ( scroll > self.scaleEnergy.range()[1] ){
                        $mid.fadeOut('fast');
                        $headings.fadeOut('fast');
                    } else {
                        $mid.fadeIn('fast');
                        $headings.fadeIn('fast');
                    }
                });

                function scrollTo(){
                    var $this = $(this)
                        ,$par = $this.parent()
                        ,meter = $par.find('.meter').val()
                        ,mag = $par.find('.mag').val()
                        ,val = parseFloat([meter, mag].join('e'))
                        ,scale = $par.is($inputEnergy) ? self.scaleEnergy : self.scaleMass
                        ,pos = scale( val ) - fudge
                        ;
                    
                    if (pos && pos > 0 ){

                        if ( self.scroller ){

                            self.scroller.scrollBy(0, -pos, 500);
                        } else {

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
                }

                $(document).on({
                    // 'keyup': function( e ){
                    //     disable = true;
                    //     clearTimeout(to);
                    //     if ( e.keyCode === 13 ){
                    //         scrollTo.call(this);
                    //     } else {
                    //         to = setTimeout(scrollTo.bind(this), 1000);
                    //     }
                    // },
                    'blur': function(){
                        disable = false;
                        $(window).trigger('scroll');
                    }
                }, '#middle input[type="text"]')
                .on('click tap', '.marker', function(){
                    var pos = ($(this).offset().top - 340)|0;
                    
                    if ( self.scroller ){

                        self.scroller.scrollBy(0, -pos, 500);
                    } else {

                        $('body').animate({
                            scrollTop: pos
                        }, {
                            duration: 500,
                            complete: function(){
                                $(window).trigger('scroll');
                            }
                        });
                    }
                })
                .on('change', '#middle .energy-controls select', function(){
                    // change the scale and remember it
                    self.scaleEnergy = self.axisEnergy.scaleBy( 1 / parseFloat($(this).val()) );
                    // reset numbers
                    $(window).trigger('scroll');
                })
                .on('change', '#middle .mass-controls select', function(){
                    // change the scale and remember it
                    self.scaleMass = self.axisMass.scaleBy( 1 / parseFloat($(this).val()) );
                    // reset numbers
                    $(window).trigger('scroll');
                });
            },

            placeAxis : function( el, scale, orientation ){

                var self = this
                    ,svg = el.append('svg')
                    ,axis = d3.svg.axis()
                    ,width = 100
                    ,domain = scale.domain()
                    ,axesGrp
                    ,tick
                    ,vals
                    ,arr
                    ;

                axis.scale( scale )
                    .orient( orientation || 'left' )
                    .tickFormat('')
                    .innerTickSize( 4 )
                    // .outerTickSize( 20 )
                    ;
                
                axesGrp = svg.attr('class', 'axis')
                    .attr('width', width)
                    .attr('height', scale.range()[1])
                    .append('g')
                    ;

                axesGrp.attr('transform', 'translate('+ (orientation === 'left' ? width - 1 : 1) +','+self.axisOffset+')')
                    .call( axis )
                    ;

                arr = scale.ticks();
                vals = [];
                for ( var i = 0, l = arr.length; i < l; ++i ){
                    
                    if (Math.abs(arr[i] / Math.pow(10, Math.round(log10(arr[i]))) - 1) < 1e-4){
                        vals.push( arr[i] );
                    }
                }

                tick = axesGrp.append('g').selectAll('text').data( vals )
                    .enter()
                    .append('g')
                    .attr('class', 'tick-labels')
                    .attr('transform', function(d){
                        return 'translate(0,'+scale(d)+')';
                    })
                    ;

                tick.append('line')
                    .attr('x2', (orientation === 'left' ? -8 : 8))
                    .attr('y2', 0)
                    ;
                tick.append('text')
                    .attr('x', (orientation === 'left' ? -20 : 20))
                    .attr('text-anchor', (orientation === 'left')? 'end': 'start')
                    .attr('alignment-baseline', 'central')
                    .text('10')
                    .append('tspan')
                    .attr('baseline-shift', 'super')
                    .text(function(n){
                        return Math.round(log10(n));  
                    })
                    ;

                // scale the original axis by a value and return the d3 scale
                function scaleBy( val ){

                    var sc = scale.copy().domain([ domain[0] * val, domain[1] * val ]);
                    axis.scale( sc );
                    svg.select('g').call( axis );
                    return sc;
                }

                return {
                    axis: axis,
                    svg: svg,
                    scaleBy: scaleBy
                };
            },

            placeMarkers : function( wrap, data, scale, idPfx ){

                var self = this
                    ,markers
                    ,tag
                    ,vals = data.map(function( el ){
                        return el[0];
                    })
                    ,format = d3.format('.2e')
                    ;

                
                markers = wrap.selectAll('.marker').data( data );

                tag = markers.enter()
                    .append('div')
                    .attr('id', function( d ){
                        return idPfx + format( d[0] );
                    })
                    .attr('class', function( d ){
                        var cls = 'marker ';
                        if ( d[5] ){
                            cls += d[5];
                        }
                        return cls;
                    })
                    .style(pfx('transform'), function( d ){ return 'translate3d(0,'+scale( d[0] )+'px, 0)'; })
                    .append('abbr')
                        .each(function( d ){
                            var el = d3.select(this)
                                ,shim = d[ 3 ]
                                ,up
                                ;

                            if ( shim === undefined ){
                                return;
                            }

                            el.attr('class', (shim > 0) ? 'shim-down' : 'shim-up');
                            el.style('margin-top', (shim > 0) ? '' : shim + 'px');
                        })
                        .attr('title', function( d ){ return d[0].toPrecision(2) + ' joules'; })
                        .html(function( d ){ 
                            var link = d[2] ? ' <a href="'+d[2]+'" class="more" target="_blank">(more info)</a>' : '';
                            var img = '';
                            var style = '';
                            if ( d[4] ){
                                img = d[4].split(':');
                                style = (img.length > 1) ? 'style="left:'+img[1]+'px; top:'+img[2]+'px;"' : '';
                                img = '<img width="160" class="thumb" src="library/images/drawings/'+img[0]+'" '+ style +'>';
                            }
                            return '<div class="shim"></div><div class="text">'+d[1]+'</div>'+link+img; 
                        })
                        .select('div')
                        .style('height', function( d ){
                            return Math.abs(d[ 3 ]) + 'px';
                        })
                    ;

            }

        }, ['events']);

        return new Mediator();
    }
);




