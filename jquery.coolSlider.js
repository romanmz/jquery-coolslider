/*
 * coolslider v2.2
 * http://github.com/romanmz/coolslider
 * By Roman Martinez - http://romanmz.com
 */

;(function($,window,undefined){
	
	
	
	// ----- PRIVATE DATA -----
	var name = 'coolslider';
	var dataBK = name+'Backup';
	var dataClass = name+'Classname';
	var defaults = {
		
		type:		'scroll',
		swipe:		true,
		slides:		'> *',
		timer:		8000,
		speed:		500,
		showFirst:	1,
		loop:		false,
		autoplay:	false,
		keyboard:	true,
		fixHeight:	false,
		classSelected:		'selected',
		classAutoplaying:	'autoplaying',
		classTransitioning:	'transitioning',
		classDisabled:		'disabled',
		prev:		'',
		next:		'',
		play:		'',
		stop:		'',
		links:		'',
		linksTitle:	'',
		current:	'',
		total:		''
		
	};
	
	// -- Detect transforms3d
	// https://gist.github.com/lorenzopolidori/3794226
	function hasTransforms3D() {
		var el = document.createElement('p'),
		has3d,
		transforms = {
			'webkitTransform':'-webkit-transform',
			'OTransform':'-o-transform',
			'msTransform':'-ms-transform',
			'MozTransform':'-moz-transform',
			'transform':'transform'
		};
		document.body.insertBefore(el, null);
		for( var t in transforms ) {
			if( el.style[t] !== undefined ) {
				el.style[t] = 'translate3d(1px,1px,1px)';
				has3d = window.getComputedStyle(el).getPropertyValue(transforms[t]);
			}
		}
		document.body.removeChild(el);
		return ( has3d !== undefined && has3d.length > 0 && has3d !== "none" );
	}
	
	// -- Detect transitions
	// http://stackoverflow.com/questions/7264899/detect-css-transitions-using-javascript-and-without-modernizr/13081497#13081497
	function hasTransitions() {
		var s = document.createElement('p').style;
		var supportsTransitions =	'transition' in s ||
									'WebkitTransition' in s ||
									'MozTransition' in s ||
									'msTransition' in s ||
									'OTransition' in s;
		return supportsTransitions;
	}
	
	
	
	// ----- PLUGIN CONSTRUCTOR -----
	window[name] = function( element, settings ) {
		// Convert to jquery
		element = $(element);
		
		// If there's an old API, destroy it
		if( element.data(name) )
			element.data(name).destroy();
		
		// Store new slider and new API
		this.slider = element.data(name,this);
		
		// Trigger init() if settings are set
		if( typeof settings == 'object' )
			this.init( settings );
	}
	$.fn[name] = function( settings ) {
		if( typeof settings == 'undefined' ) settings = null;
		return this.each(function(){
			if( !$(this).data( name ) )
				new coolslider( this, settings )
		});
	};
	$.fn[name].defaults = defaults;
	
	// Automatic sliders
	$(document).ready(function(){ $( '.auto-'+name )[name]() });
	
	
	
	// ----- INIT PLUGIN -----
	coolslider.prototype = {
		init: function( settings ) {
			
			// -- Init
			if( typeof this.slider.data(name) == 'undefined' )
				this.slider.data( name, this );
			
			if( this.data || this !== this.slider.data(name) ) {
				return this;
			}
			var P = this, slider = P.slider;
			
			// -- Get Settings
			settings = P.settings = $.extend( {}, $.fn[name].defaults, settings, slider.data( name.toLowerCase()+'Options' ) );
			
			// -- Get Slides
			var slides = P.slides = slider.find( settings.slides );
			if( slides.length < 2 ) {
				return this;
			}
			
			// -- Placeholder for Wrapper
			P.wrapper = $();
			
			// -- Get Data
			var data = P.data = {
				total: slides.length,
				selected: undefined,
				previous: undefined,
				loopDirection: 0,
				isMoving: false,
				isPlaying: settings.autoplay,
				timerChange: false,
				timerTransition: false,
				timerFixHeight: false,
				speed: settings.speed,
				isTouch: (settings.swipe && ('ontouchstart' in window || navigator.msMaxTouchPoints > 0) ),
				hasTransforms3D: (typeof Modernizr!='undefined' && Modernizr.csstransforms3d) || hasTransforms3D(),
				hasTransitions: (typeof Modernizr!='undefined' && Modernizr.csstransitions) || hasTransitions()
			};
			
			// -- Get Effect
			var effect = (data.isTouch && settings.swipe!==true) ? settings.swipe : settings.type;
			if( typeof effect === 'string' && typeof $.fn[name].effects[effect] === 'function' ) {
				effect = $.fn[name].effects[effect];
			} else if( typeof effect !== 'function' ) {
				effect = $.fn[name].effects[defaults.type];
			}
			
			// -- Setup Events and Controls
			P._initEvents();
			P._initTouchEvents();
			P._initControls();
			
			// -- Trigger Initializers
			effect.call( P, slider, slides, settings, data );
			slider.trigger( 'init' );
			P.goTo( (settings.showFirst == 'random') ? Math.floor( Math.random() * data.total ) : settings.showFirst-1, 0 );
			return this;
		},
		
		
		
		// ----- DESTROY -----
		destroy: function() {
			
			// -- Init
			if( this !== this.slider.data(name) )
				return this;
			
			var P = this, settings = P.settings, data = P.data, slider = P.slider, slides = P.slides, controls = P.controls;
			
			// -- Slider
			slider
				.trigger( 'destroy' )
				.off( 'touchstart.'+name+' touchmove.'+name+' touchend.'+name+' slidestart.'+name+' slideend.'+name+' init.'+name+' destroy.'+name )
				.removeData( name );
			if( settings ) {
				slider.removeClass( settings.classTransitioning+' '+settings.classAutoplaying )
			}
			
			// -- Wrapper
			if( P.wrapper && P.wrapper.data( dataBK ) ) {
				slides.unwrap();
			}
			
			// -- Slides
			if( slides ) {
				slides
				.height('')
				.each(function(){
					$(this).removeClass( $(this).data(dataClass) ).removeData( dataClass );
				});
			}
			
			// -- Controls
			if( controls ) {
				controls.prev.removeClass( settings.classDisabled ).off( 'click.'+name );
				controls.next.removeClass( settings.classDisabled ).off( 'click.'+name );
				controls.play.removeClass( settings.classAutoplaying ).off( 'click.'+name );
				controls.stop.removeClass( settings.classAutoplaying ).off( 'click.'+name );
				controls.current.html( controls.current.data(dataBK) ).removeData( dataBK );
				controls.total.html( controls.total.data(dataBK) ).removeData( dataBK );
				controls.links.each(function(i){
					var el = $(this);
					if( el.data(dataBK) === true )
						el.remove();
					else
						el.find( settings.linksTitle ).html( el.data(dataBK) );
					el.removeClass( el.data(dataClass) ).removeData( dataBK+' '+dataClass );
				}).off( 'click.'+name );
			}
			
			// -- Data
			if( data ) {
				clearTimeout( data.timerTransition );
				clearTimeout( data.timerChange );
				clearTimeout( data.timerFixHeight );
			}
			
			// -- Other
			$(document).off( 'keydown.'+name );
			$(window).off( 'load.'+name+' '+'resize.'+name );
			
			// -- Plugin
			delete this.wrapper;
			delete this.slides;
			delete this.controls;
			delete this.data;
			delete this.touchData;
			
			return this;
		},
		
		
		
		// ----- INIT EVENTS -----
		_initEvents: function() {
			
			// -- Init
			var P = this, settings = P.settings, data = P.data, slider = P.slider, slides = P.slides;
			
			// -- Support Keyboard
			if( settings.keyboard ) {
				$(document).on( 'keydown.'+name, function(e){
					var key = e.which;
					if( key==37 )		P.previous();
					else if( key==39 )	P.next();
				});
			}
			
			// -- Fix Height with Javascript
			if( settings.fixHeight ) {
				
				function fixSize() {
					// Exit if destroy() was called
					if( !P.data ) return;
					// Fix height
					var maxH = 0;
					slides.height('').each(function(){
						maxH = Math.max( maxH, $(this).height() );
					}).height( maxH );
					// Call again
					data.timerFixHeight = setTimeout( fixSize, 1000 );
				}
				
				fixSize();
				$(window).on( 'load.'+name+' '+'resize.'+name, fixSize );
				if( typeof $.fn.imagesLoaded == 'function' ) {
					slides.imagesLoaded().progress( fixSize );
				}
			}
			
			return this;
		},
		
		
		
		// ----- INIT TOUCH EVENTS -----
		_initTouchEvents: function() {
			
			// -- Init
			if( this.touchData || this !== this.slider.data(name) ) {
				return this;
			}
			var P = this, settings = P.settings, data = P.data, slider = P.slider, slides = P.slides;
			var touchData = P.touchData = {};
			if( !this.data.isTouch ) {
				return this;
			}
			
			slider
			// -- Touchstart
			.on( 'touchstart.'+name, function(e){
				var touches = e.originalEvent.touches[0];
				
				// Start data
				touchData.startX = touches.pageX;
				touchData.startY = touches.pageY;
				touchData.startTime = +new Date;
				touchData.areaWidth = slider.innerWidth();
				touchData.areaHeight = slider.innerHeight();
				
				// Move data
				touchData.deltaX = 0;
				touchData.deltaY = 0;
				touchData.ratioX = 0;
				touchData.ratioY = 0;
				touchData.directionX = 0;
				touchData.directionY = 0;
				touchData.direction = '';
				
				// End data
				touchData.swipedX = false;
				touchData.swipedY = false;
				
			})
			
			// -- Touchmove
			.on( 'touchmove.'+name, function(e){
				e = e.originalEvent;
				
				// Exit if user is pinching
				if( e.touches.length>1 || e.scale && e.scale!==1 ) {
					return;
				}
				
				// Update vars
				touchData.deltaX = e.touches[0].pageX - touchData.startX;
				touchData.deltaY = e.touches[0].pageY - touchData.startY;
				touchData.ratioX = touchData.deltaX / touchData.areaWidth;
				touchData.ratioY = touchData.deltaY / touchData.areaHeight;
				touchData.directionX = (touchData.deltaX < 0) ? 1 : -1;
				touchData.directionY = (touchData.deltaY < 0) ? 1 : -1;
				if( !touchData.direction )
					touchData.direction = Math.abs( touchData.deltaY ) > Math.abs( touchData.deltaX ) ? 'y' : 'x';
				
			})
			
			// -- Touchend
			.on( 'touchend.'+name, function(e){
				
				// Determine if swipe was strong enough
				var quickSwipe = +new Date - touchData.startTime < 250;
				if( touchData.direction=='x' ) {
					var minimumSwipe = Math.abs( touchData.deltaX ) > 20;
					var longSwipe = Math.abs( touchData.ratioX ) > .5;
					touchData.swipedX = longSwipe || quickSwipe && minimumSwipe;
				} else {
					var minimumSwipe = Math.abs( touchData.deltaY ) > 20;
					var longSwipe = Math.abs( touchData.ratioY ) > .5;
					touchData.swipedY = longSwipe || quickSwipe && minimumSwipe;
				}
				
			})
			
			return this;
		},
		
		
		
		// ----- INIT CONTROLS -----
		_initControls: function() {
			
			// -- Init
			if( this.controls || this !== this.slider.data(name) ) {
				return this;
			}
			var P = this, settings = P.settings, data = P.data, slider = P.slider, slides = P.slides;
			var controls = P.controls = $();
			
			// -- Create Controls
			controls.prev = $( settings.prev );
			controls.next = $( settings.next );
			controls.play = $( settings.play );
			controls.stop = $( settings.stop );
			controls.current = $( settings.current );
			controls.total = $( settings.total );
			controls.links = $( settings.links );
			
			// -- Initial Data
			if( data.isPlaying ) {
				controls.play.addClass( settings.classAutoplaying );
				controls.stop.addClass( settings.classAutoplaying );
			}
			controls.current.data( dataBK, controls.current.html() );
			controls.total.data( dataBK, controls.total.html() );
			
			// -- Create Numbered Links
			for( var i=0; i<data.total; i++ ) {
				var thisLink = controls.links.eq(i);
				
				// Check if link already exists, or create a new one
				if( thisLink.length ) {
					thisLink.data( dataBK, thisLink.find( settings.linksTitle ).html() );
				} else {
					thisLink = controls.links.last().clone().insertAfter( controls.links.last() ).removeData('slide-title');
					controls.links = controls.links.add( thisLink );
					thisLink.data( dataBK, true );
				}
				
				// Add title
				var title = slides.eq(i).data('slide-title');
				if( !title ) title = i+1;
				thisLink.find( settings.linksTitle ).text( title );
				
			}
			
			// -- Update on Slidestart
			slider.on( 'slidestart.'+name, function(){ P.updateControls() } );
			
			// -- Click Events
			controls.prev.on( 'click.'+name, function(e){
				P.previous();
				e.preventDefault();
			});
			controls.next.on( 'click.'+name, function(e){
				P.next();
				e.preventDefault();
			});
			controls.play.on( 'click.'+name, function(e){
				P.play();
				e.preventDefault();
			});
			controls.stop.on( 'click.'+name, function(e){
				P.stop();
				e.preventDefault();
			});
			controls.links.on( 'click.'+name, function(e){
				data.loopDirection = 0;
				P.goTo( controls.links.index( $(this) ) );
				e.preventDefault();
			});
			
			return this;
		},
		updateControls: function() {
			
			// Init
			var P = this, settings = P.settings, data = P.data, slider = P.slider, controls = P.controls;
			
			// Update prev / next
			var prevClass = (settings.loop || data.selected > 0) ? 'removeClass' : 'addClass';
			controls.prev[prevClass]( settings.classDisabled );
			var nextClass = (settings.loop || data.selected < data.total-1) ? 'removeClass' : 'addClass';
			controls.next[nextClass]( settings.classDisabled );
			
			// Update play / stop
			var autoplayClass = (data.isPlaying) ? 'addClass' : 'removeClass';
			controls.play[autoplayClass]( settings.classAutoplaying );
			controls.stop[autoplayClass]( settings.classAutoplaying );
			slider[autoplayClass]( settings.classAutoplaying );
			
			// Update numbers
			P._updateClasses( controls.links );
			controls.current.text( data.selected+1 );
			controls.total.text( data.total );
			
			return this;
		},
		
		
		
		// ----- UTILITIES -----
		_limitRange: function( number ) {
			
			var last = this.data.total - 1;
			var loop = this.settings.loop;
			return (number>last) ? (loop) ? 0 : last : (number<0) ? (loop) ? last : 0 : number;
			
		},
		_getWrapper: function() {
			
			if( !this.wrapper.length ) {
				var wrapper = this.slides.parent();
				if( wrapper.is( this.slider ) || wrapper.length > 1 ) {
					var newWrapper = $('<div>').data( dataBK, true );
					this.slides.wrapAll( newWrapper );
				}
				this.wrapper = this.slides.parent();
			}
			return this.wrapper;
			
		},
		_updateClasses: function( elements, offset ) {
			
			// Init
			var P = this;
			if( typeof offset === 'undefined' ) offset = 0;
			
			// Update elements
			elements.each(function(i){
				var reference = P.data.selected + offset;
				if( i - reference == 0 )
					var thisClass = P.settings.classSelected;
				else
					var thisClass = 'not-'+P.settings.classSelected+' '+P.settings.classSelected + (i - reference);
				
				$(this)
					.removeClass( $(this).data( dataClass ) )
					.addClass( thisClass )
					.data( dataClass, thisClass );
			});
			
			return this;
		},
		
		
		
		// ----- SLIDING FUNCTIONS -----
		goTo: function( number, speed, forced ) {
			
			// -- Init
			var P = this, settings = P.settings, data = P.data, slider = P.slider, slides = P.slides, controls = P.controls;
			if( typeof speed === 'undefined' ) speed = settings.speed;
			if( typeof forced === 'undefined' ) forced = false;
			
			// -- Validate
			number = P._limitRange( number );
			if( !forced && (data.isMoving || number==data.selected) ) {
				return this;
			}
			
			// -- Update Data
			data.isMoving = true;
			data.previous = ( data.selected >= 0 && data.selected != number ) ? data.selected : undefined;
			data.selected = number;
			data.speed = speed;
			if( data.loopDirection == 0 ) {
				data.loopDirection = (data.selected - data.previous > 0) ? 1 : -1;
			}
			clearTimeout( data.timerChange );
			clearTimeout( data.timerTransition );
			
			// -- Trigger Transition
			P._updateClasses( slides );
			slider.addClass( settings.classTransitioning );
			slider.trigger( 'slidestart' );
			
			// -- End Transition
			data.timerTransition = setTimeout(function(){
				
				data.isMoving = false;
				if( data.isPlaying )
					P.play();
				slider.removeClass( settings.classTransitioning );
				slider.trigger( 'slideend' );
				
			}, data.speed );
			
			return this;
		},
		previous: function() {
			
			this.data.loopDirection = -1;
			this.goTo( this.data.selected-1 );
			return this;
			
		},
		next: function() {
			
			this.data.loopDirection = 1;
			this.goTo( this.data.selected+1 );
			return this;
			
		},
		stop: function() {
			
			this.data.isPlaying = false;
			this.updateControls();
			this.goTo( this.data.selected, 0, true );
			return this;
			
		},
		play: function() {
			
			var P = this, data = P.data;
			data.isPlaying = true;
			P.updateControls();
			clearTimeout( data.timerChange );
			
			data.timerChange = setTimeout(function(){
				var next = ( data.selected+1 > data.total-1 ) ? 0 : data.selected+1;
				data.loopDirection = 1;
				P.goTo( next );
			}, P.settings.timer );
			
			return this;
			
		}
		
	}
	
	
	
	// ----- EFFECTS -----
	$.fn[name].effects = {
		
		
		// ----- EFFECT: CSS -----
		css: function( slider, slides, settings, data ) {},
		
		
		
		// ----- EFFECT: TABS -----
		tabs: function( slider, slides, settings, data ) {
			
			slider.on( 'slidestart.'+name, function(){
				slides.hide().eq( data.selected ).show();
			})
			
			// -- Destroy
			.on( 'destroy.'+name, function(){
				slides.css({ display:'' });
			});
			
		},
		
		
		
		// ----- EFFECT: FADE -----
		fade: function( slider, slides, settings, data ) {
			
			// -- Init
			var P = this, touchData = P.touchData;
			var wrapper = P._getWrapper();
			var slideWidth = 100 / data.total;
			var timer;
			
			// -- Setup Styles
			slider.css({ overflow:'hidden' });
			wrapper.css({ position:'relative', left:0, top:0, width:( data.total * 100 )+'%' });
			slides.css({ position:'relative', float:'left', width:slideWidth+'%', zIndex:0, opacity:0, visibility:'hidden' }).each(function(i){
				$(this).css({ left: slideWidth * -i + '%' });
			});
			
			// -- Transition Function
			function transitionTo( slideIn, slideOut, ratio, speed ) {
				
				slides.stop( true, true );
				if( !slideIn.not( slideOut ).length )
					return;
				
				if( speed==0 ) {
					slideIn.css({ opacity:ratio });
					slideOut.not( slideIn ).css({ opacity:1-ratio });
				} else {
					slideIn.fadeTo( speed, ratio );
					timer = setTimeout(function(){
						slideOut.not( slideIn ).fadeTo( speed/2, 1-ratio );
					}, speed/2 );
				}
				
			}
			
			slider
			// -- Slidestart
			.on( 'slidestart.'+name, function(){
				var selected = slides.eq( data.selected );
				selected.css({ visibility:'visible', zIndex:1 });
				transitionTo( selected, slides.eq( data.previous ), 1, data.speed );
			})
			
			// -- Slideend
			.on( 'slideend.'+name, function(){
				var selected = slides.eq( data.selected );
				selected.css({ zIndex:0 });
				slides.not( selected ).css({ zIndex:0, visibility:'hidden', opacity:0 });
			})
			
			if( data.isTouch ) {
				
				slider
				// -- Touchstart
				.on( 'touchstart.'+name, function(){
					P.stop();
				})
				
				// -- Touchmove
				.on( 'touchmove.'+name, function(e){
					e = e.originalEvent;
					if( touchData.direction=='x' ) {
						var slide1 = slides.eq( data.selected );
						var slide2 = slides.eq( P._limitRange( data.selected + touchData.directionX ) );
						var ratio = 1 - ( touchData.ratioX * -touchData.directionX );
						slide2.css({ visibility:'visible', zIndex:1 });
						transitionTo( slide1, slide2, ratio, 0 );
						e.preventDefault();
					}
				})
				
				// -- Touchend
				.on( 'touchend.'+name, function(){
					if( touchData.swipedX ) {
						P.goTo( data.selected + touchData.directionX, settings.speed, true );
					} else if( touchData.direction=='x' ) {
						P.goTo( data.selected, settings.speed, true );
					}
				})
				
			}
			
			// -- Destroy
			slider.on( 'destroy.'+name, function(){
				clearTimeout( timer );
				slider.css({ overflow:'' });
				wrapper.css({ position:'', left:'', top:'', width:'' });
				slides.stop(true,true).css({ position:'', float:'', width:'', zIndex:'', opacity:'', visibility:'', left:'' });
			});
			
		},
		
		
		
		// ----- EFFECT: SCROLL -----
		scroll: function( slider, slides, settings, data ) {
			
			// -- Init
			var P = this
			var touchData = P.touchData;
			var loop = ( settings.loop );
			var resistance = 1;
			var allSlides = slides;
			
			// -- Clone Slides
			var clonesOffset = 0;
			if( loop ) {
				var clones1 = slides.clone().insertBefore( slides.first() );
				var clones2 = slides.clone().insertAfter( slides.last() );
				allSlides = clones1.add( slides ).add( clones2 );
				clonesOffset = -slides.length;
			}
			
			// -- Create invisible placeholder
			var placeholder = $('<div>').css({ overflow:'hidden', visibility:'hidden', opacity:0 });
			var placeholderInner = $('<div>').css({ width: ( slides.length * 100 )+'%' });
			var placeholderSlides = slides.clone().css({ width: ( Math.floor( 100 / slides.length * 100 ) / 100 ) +'%', float: 'left' });
			slider.prepend( placeholder.append( placeholderInner.append( placeholderSlides ) ) );
			
			// -- Setup Styles
			if( slider.css( 'position' ) == 'static' )
				slider.css( 'position', 'relative' );
			allSlides
				.css({ position:'absolute', top:0, width:'100%', height:'100%' })
				.each(function(i){ $(this).css( 'left', ( ( i + clonesOffset ) * 100 )+'%' ) });
			
			
			// -- Transition Function
			function transitionTo( target, speed ) {
				var left = ( target * -100 )+'%';
				if( data.hasTransforms3D && data.hasTransitions ) {
					allSlides.css({ transform: 'translate3d('+left+',0,0)', 'transition':'all '+speed+'ms' });
				} else {
					allSlides.animate({ marginLeft: left }, speed );
				}
			}
			
			slider
			// -- Slidestart
			.on( 'slidestart.'+name, function(){
				var target = data.selected;
				
				// Loop
				outOfRange = false;
				if( loop ) {
					if( (data.selected - data.previous) * data.loopDirection < 0 ) {
						target += data.total * data.loopDirection;
						outOfRange = true;
					}
					
					// Update classes of cloned slides
					var offset = data.total;
					if( outOfRange )
						offset += data.total * data.loopDirection;
					P._updateClasses( allSlides, offset );
					
				}
				
				transitionTo( target, data.speed );
			})
			
			// -- Slideend
			.on( 'slideend.'+name, function(){
				
				allSlides.not( slides.eq( data.selected ) )
					.css({ transition:'none' });
				
				if( loop && outOfRange ) {
					transitionTo( data.selected, 0 );
					P._updateClasses( allSlides, data.total );
				}
				
			})
			
			if( data.isTouch ) {
				
				slider
				// -- Touchstart
				.on( 'touchstart.'+name, function(){
					P.stop();
					resistance = 1;
				})
				
				// -- Touchmove
				.on( 'touchmove.'+name, function(e){
					e = e.originalEvent;
					if( touchData.direction=='x' ) {
						// Add resistance
						if( !loop && (
								( data.selected <= 0 && touchData.deltaX > 0 ) ||
								( data.selected >= data.total-1 && touchData.deltaX < 0 )
							)
						) {
							resistance = Math.abs( touchData.deltaX ) / touchData.areaWidth + 2;
						}
						var target = data.selected + ( touchData.ratioX / -resistance );
						transitionTo( target, 0 );
						e.preventDefault();
					}
				})
				
				// -- Touchend
				.on( 'touchend.'+name, function(){
					if( touchData.swipedX ) {
						data.loopDirection = touchData.directionX;
						P.goTo( data.selected + touchData.directionX, settings.speed, true );
					} else if( touchData.direction=='x' ) {
						transitionTo( data.selected, settings.speed );
					}
				})
				
			}
			
			slider
			// -- Destroy
			.on( 'destroy.'+name, function(){
				clones1.add( clones2 ).remove();
				slider.css({ position:'' });
				wrapper.stop(true,true).css({ position:'', left:'', top:'', overflow:'', width:'', transform:'', transitionDuration:'' });
				slides.css({ float:'', width:'' });
			});
			
		}
		
		
	};
	
	
	
})(jQuery,window);