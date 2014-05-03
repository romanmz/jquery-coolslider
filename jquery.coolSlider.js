/*!
 * coolSlider v1.6
 * http://github.com/romanmz/coolSlider
 * By Roman Martinez - http://romanmz.com
 */

;(function($,window,undefined){
	
	
	
	// ----- PRIVATE DATA -----
	var name = 'coolSlider';
	var defaults = {
		
		type: 'fade',			// 'fade' or 'scroll'
		swipe: 'scroll',		// false, 'fade' or 'scroll'
		slides: '> *',			// css selector
		timer: 8000,			// milliseconds (time before changing slides when autoplay is on)
		speed: 500,				// milliseconds (speed of transition between slides)
		showFirst: 1,			// number or 'random'
		
		loop: false,			// true or false
		autoplay: false,		// true or false
		keyboard: true,			// true or false
		fixHeight: false,		// true or false (for better results, load the "imagesLoaded" plugin)
		
		// Class Names
		selectedSlideClass: 'selected',
		previousSlideClass: 'previous',
		controlsDisabledClass: 'disabled',
		controlsPausedClass: 'paused',
		controlsSelectedClass: 'selected',
		
		// Controls Selectors
		prev:		'',
		next:		'',
		play:		'',
		pause:		'',
		links:		'',
		linksNumber:'',
		current:	'',
		total:		'',
		visualTimer:'',
		
		// Callbacks
		init: function(){},
		slidestart: function(){},
		slideend: function(){},
		touchstart: function(){},
		touchmove: function(){},
		touchend: function(){},
		swipesuccess: function(){},
		swipefail: function(){}
	};
	
	// Detect transforms3d. https://gist.github.com/lorenzopolidori/3794226
	function hasTransforms3d() {
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
	
	// Detect transitions. http://stackoverflow.com/questions/7264899/detect-css-transitions-using-javascript-and-without-modernizr/13081497#13081497
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
	var Plugin = function( element, options ) {
		this.element = element;
		this.options = $.extend( {}, $.fn[name].defaults, options, element.data( name.toLowerCase() ) );
		this._init( element, this.options );
	}
	$.fn[name] = function( options ) {
		return this.each(function(){
			if( !$(this).data( name+'API' ) ) {
				$(this).data( name+'API', new Plugin( $(this), options ) );
			}
		});
	};
	$.fn[name].defaults = defaults;
	
	
	
	// ----- INIT PLUGIN -----
	Plugin.prototype = {
		_init: function( element, options ) {
			
			// Init vars
			var P = this;
			var slides;
			var data;
			var type;
			
			// Continue only if there's at least 2 slides
			slides = P.slides = element.find( options.slides );
			if( slides.length < 2 ) {
				return;
			}
			
			// Set data
			data = P.data = {
				total: slides.length,
				selected: -1,
				previous: -1,
				loopDir: 0,
				moving: false,
				timerChange: false,
				timerTransition: false,
				forced: false,
				speed: options.speed,
				playing: options.autoplay,
				touch: (options.swipe && ('ontouchstart' in window || navigator.msMaxTouchPoints > 0) ),
				selectedSlide: $(),
				previousSlide: $(),
				otherSlides: $(),
				visualTimer: $(options.visualTimer),
				csstransforms3d: (typeof Modernizr!='undefined' && Modernizr.csstransforms3d) || hasTransforms3d(),
				csstransitions: (typeof Modernizr!='undefined' && Modernizr.csstransitions) || hasTransitions()
			};
			if( options.showFirst == 'random' ) {
				options.showFirst = Math.ceil( Math.random() * data.total );
			}
			
			// Support keyboard navigation
			if( options.keyboard ) {
				$(document).on( 'keydown.'+name, function(e){
					var key = e.which;
					if( key==37 )		P.showPrevious();
					else if( key==39 )	P.showNext();
				});
			}
			
			// Support touch events
			P.addTouchEvents();
			
			// Get selected type of slider, if not found, use default
			type = (data.touch) ? options.swipe : options.type;
			if( typeof type === 'string' && typeof $.fn[name].transitions[type] === 'function' ) {
				type = $.fn[name].transitions[type];
			}
			if( typeof type !== 'function' ) {
				type = $.fn[name].transitions[defaults.type];
			}
			type.call( P, element, slides, options, data );
			
			// Run other initializers
			options.init.call( P, element, slides, options, data );
			P.initControls();
			P.showSlide( options.showFirst-1, 0 );
			
			// Fix Slides Size with Javascript
			if( options.fixHeight ) {
				function fixSize() {
					
					// Check height
					var maxH = 0;
					slides.height('').each(function(){
						maxH = Math.max( maxH, $(this).height() );
					}).height( maxH );
					
				}
				fixSize();
				setTimeout( fixSize, 500 );
				$(window).on( 'load.'+name, fixSize );
				$(window).on( 'resize.'+name, fixSize );
				if( typeof $.fn.imagesLoaded == 'function' ) {
					slides.imagesLoaded().progress( fixSize );
				}
			}
			
		},
		
		
		
		// ----- ADD TOUCH EVENTS -----
		addTouchEvents: function() {
			
			// Init vars
			var P = this, element = P.element, slides = P.slides, options = P.options, data = P.data;
			var touchData = data.touchData = {};
			
			// Validate
			if( !data.touch ) {
				return;
			}
			
			element
			// ----- EVENT: touchstart -----
			.on( 'touchstart.'+name, function(e){
				var touches = e.originalEvent.touches[0];
				touchData.startX = touches.pageX;
				touchData.startY = touches.pageY;
				touchData.startTime = +new Date;
				touchData.deltaX = 0;
				touchData.deltaY = 0;
				touchData.resistance = 1;
				touchData.isVertical = undefined;
				touchData.width = element.innerWidth();
				touchData.swipeX = 0;
				touchData.direction = 0;
				// Callback
				options.touchstart.call( P, element, slides, options, data );
			})
			
			// ----- EVENT: touchmove -----
			.on( 'touchmove.'+name, function(e){
				e = e.originalEvent;
				
				// Exit if user is pinching
				if( e.touches.length>1 || e.scale && e.scale!==1 ) {
					return;
				}
				
				// Update vars
				touchData.deltaX = e.touches[0].pageX - touchData.startX;
				touchData.deltaY = e.touches[0].pageY - touchData.startY;
				
				// Exit if swipe is vertical
				if( typeof touchData.isVertical == 'undefined' ) {
					touchData.isVertical = ( Math.abs( touchData.deltaX ) < Math.abs( touchData.deltaY ) );
				}
				if( touchData.isVertical ) {
					return;
				}
				
				// Add resistance and relative swipe data
				if(
					( data.selected <= 0 && touchData.deltaX > 0 ) ||
					( data.selected >= data.total-1 && touchData.deltaX < 0 )
				) {
					touchData.resistance = Math.abs( touchData.deltaX ) / touchData.width + 2;
				}
				touchData.swipeX = touchData.deltaX / touchData.width;
				touchData.direction = (touchData.deltaX < 0) ? 1 : -1;
				
				// Cancel default action
				e.preventDefault();
				
				// Callback
				options.touchmove.call( P, element, slides, options, data );
			})
			
			// ----- EVENT: touchend -----
			.on( 'touchend.'+name, function(e){
				// Exit if its vertical swipe
				if( touchData.isVertical ) {
					return;
				}
				
				// Determine if swipe was strong enough to trigger a change of slide
				var quickSwipe = ( +new Date - touchData.startTime < 250 );
				var minimumSwipe = ( Math.abs( touchData.deltaX ) > 20 );
				var longSwipe = ( Math.abs( touchData.swipeX ) > .5 );
				
				// Callbacks
				if( longSwipe || quickSwipe && minimumSwipe ) {
					element.trigger( 'swipesuccess.'+name );
					options.swipesuccess.call( P, element, slides, options, data );
				} else {
					element.trigger( 'swipefail.'+name );
					options.swipefail.call( P, element, slides, options, data );
				}
				options.touchend.call( P, element, slides, options, data );
			});
			
		},
		
		
		
		// ----- INIT CONTROLS -----
		initControls: function() {
			
			// Exit if controls are already defined
			if( this.controls ) {
				return;
			}
			
			// Set vars
			var P = this, options = P.options, data = P.data;
			var controls = P.controls = $();
			var links = $( options.links );
			
			// Select Objects
			controls.prev = $( options.prev );
			controls.next = $( options.next );
			controls.play = $( options.play );
			controls.pause = $( options.pause );
			controls.links = $();
			controls.current = $( options.current );
			controls.total = $( options.total );
			
			// Create numbered navigation
			for( var i=0; i<data.total; i++ ) {
				var thisLink = links.eq(i);
				if( !thisLink.length ) {
					thisLink = links.last().clone().insertAfter( links.last() );
					links = links.add( thisLink );
				}
				
				// Add correct number
				var title = P.slides.eq(i).data( 'slide-title' );
				if( !title ) title = i+1;
				thisLink.find( options.linksNumber ).text( title );
				
				// Add to links list
				controls.links = controls.links.add( thisLink );
			}
			
			// Add controlsPausedClass if necessary
			if( !data.playing ) {
				controls.play.addClass( options.controlsPausedClass );
				controls.pause.addClass( options.controlsPausedClass );
			}
			
			// Bind event listeners
			P.element.on( 'slidestart.'+name, function(){
				P.updateControls();
			});
			controls.prev.on( 'click.'+name, function(){
				P.showPrevious();
				return false;
			});
			controls.next.on( 'click.'+name, function(){
				P.showNext();
				return false;
			});
			controls.play.on( 'click.'+name, function(){
				P.playSlides();
				return false;
			});
			controls.pause.on( 'click.'+name, function(){
				P.stopSlides();
				return false;
			});
			controls.links.on( 'click.'+name, function(){
				data.loopDir = 0;
				P.showSlide( P.controls.links.index( $(this) ) );
				return false
			});
			
		},
		updateControls: function() {
			
			var P = this, data = P.data, options = P.options, controls = P.controls;
			
			// Reset Prev/Next
			var prevClass = (options.loop || data.selected > 0) ? 'removeClass' : 'addClass';
			controls.prev[prevClass]( options.controlsDisabledClass );
			var nextClass = (options.loop || data.selected < data.total-1) ? 'removeClass' : 'addClass';
			controls.next[nextClass]( options.controlsDisabledClass );
			
			// Reset Numbers
			controls.links.removeClass( options.controlsSelectedClass )
				.eq( data.selected ).addClass( options.controlsSelectedClass );
			controls.current.text( data.selected+1 );
			controls.total.text( data.total );
			
		},
		
		
		
		// ----- SLIDING FUNCTIONS -----
		// Limit range
		limitRange: function( number ) {
			var last = this.data.total-1;
			var loop = this.options.loop;
			return (number>last) ? (loop) ? 0 : last : (number<0) ? (loop) ? last : 0 : number;
		},
		showSlide: function( number, speed ) {
			
			var P = this, element = P.element, slides = P.slides, data = P.data, options = P.options;
			
			// Defaults
			if( typeof speed === 'undefined' ) speed = options.speed;
			
			// Validate
			number = P.limitRange( number );
			if( !data.forced && (data.moving || number==data.selected) ) {
				return;
			}
			
			// Update data
			data.forced = false;
			data.moving = true;
			data.previous = data.selected;
			data.selected = number;
			data.speed = speed;
			if( data.loopDir==0 ) {
				data.loopDir = (data.selected-data.previous > 0) ? 1 : -1;
			}
			data.selectedSlide = slides.eq( data.selected );
			data.previousSlide = (data.previous>=0) ? slides.eq(data.previous).not(data.selectedSlide) : $();
			data.otherSlides = slides.not( data.selectedSlide ).not( data.previousSlide );
			clearTimeout( data.timerChange );
			clearTimeout( data.timerTransition );
			
			// Start transition
			slides.removeClass( options.selectedSlideClass+' '+options.previousSlideClass );
			data.selectedSlide.addClass( options.selectedSlideClass );
			data.previousSlide.addClass( options.previousSlideClass );
			data.visualTimer.stop(true,false).animate({ width:0, marginLeft:'100%' },{ duration:data.speed });
			
			// Callbacks
			element.trigger( 'slidestart.'+name );
			options.slidestart.call( P, element, slides, options, data );
			
			// End transition
			data.timerTransition = setTimeout(function(){
				data.moving = false;
				if( data.playing ) {
					P.playSlides();
				}
				data.previousSlide.removeClass( options.previousSlideClass );
				
				// Callbacks
				element.trigger( 'slideend.'+name );
				options.slideend.call( P, element, slides, options, data );
				
			}, data.speed );
			
		},
		showPrevious: function() {
			
			this.data.loopDir = -1
			this.showSlide( this.data.selected-1 );
			
		},
		showNext: function() {
			
			this.data.loopDir = 1;
			this.showSlide( this.data.selected+1 );
			
		},
		stopSlides: function() {
			
			var P = this, data = P.data, controls = P.controls, options = P.options;
			if( controls ) {
				controls.play.addClass( options.controlsPausedClass );
				controls.pause.addClass( options.controlsPausedClass );
			}
			data.playing = false;
			data.forced = true;
			P.showSlide( data.selected, 0 );
			
		},
		playSlides: function() {
			
			var P = this, data = P.data, controls = P.controls, options = P.options;
			if( controls ) {
				controls.play.removeClass( options.controlsPausedClass );
				controls.pause.removeClass( options.controlsPausedClass );
			}
			data.playing = true;
			data.visualTimer.stop(true,false).css({ marginLeft:0 }).animate({ width:'100%' },{ duration:options.timer });
			
			clearTimeout( data.timerChange );
			data.timerChange = setTimeout(function(){
				next = ( data.selected+1 > data.total-1 ) ? 0 : data.selected+1;
				P.data.loopDir = 1;
				P.showSlide( next );
			}, options.timer );
			
		},
		
		
		
		// ----- OTHER -----
		createContainer: function() {
			
			var container = this.slides.parent();
			if( container.is( this.element ) || container.length > 1 ) {
				container = $('<div>').appendTo( this.element ).append( this.slides );
			}
			this.container = container;
			return this.container;
			
		}
		
	}
	
	
	
	// ----- TRANSITION -----
	$.fn[name].transitions = {
		
		
		
		// ----- TRANSITION: FADE -----
		fade: function( element, slides, options, data ) {
			
			// Create vars
			var P = this;
			var container = P.createContainer();
			var slideWidth = 100 / data.total;
			var touchData = data.touchData;
			var timer;
			
			// Setup styles
			element.css({ overflow:'hidden' });
			container.css({ position:'relative', left:0, top:0, width:( data.total * 100 )+'%' });
			slides.css({ position:'relative', float:'left', width:slideWidth+'%', zIndex:0, opacity:0, visibility:'hidden' }).each(function(i,el){
				$(this).css({ left: slideWidth*-i+'%' });
			});
			
			// Calculate Transitions
			function transitionTo( target1, target2, ratio, speed ) {
				
				if( speed==0 ) {
					target1.css({ opacity:ratio });
					target2.not(target1).css({ opacity:1-ratio });
				} else {
					target1.fadeTo( speed, ratio );
					timer = setTimeout(function(){
						target2.not(target1).fadeTo( speed/2, 1-ratio );
					}, speed/2 );
				}
				
			}
			
			// Bind events listeners
			element
			.on( 'slidestart.'+name, function(){
				data.selectedSlide.css({ visibility:'visible', zIndex:1 });
				transitionTo( data.selectedSlide, data.previousSlide, 1, data.speed );
			})
			.on( 'slideend.'+name, function(){
				data.selectedSlide.css({ zIndex:0 });
				slides.not( data.selectedSlide ).css({ zIndex:0, visibility:'hidden', opacity:0 });
			})
			.on( 'touchstart.'+name, function(){
				P.stopSlides();
			})
			.on( 'touchmove.'+name, function(){
				if( !touchData.isVertical ) {
					var target1 = slides.eq( data.selected );
					var target2 = slides.eq( P.limitRange( data.selected+touchData.direction, 0, data.total-1 ) );
					var ratio = 1-( touchData.swipeX * -touchData.direction );
					target2.css({ visibility:'visible', zIndex:1 });
					transitionTo( target1, target2, ratio, 0 );
				}
			})
			.on( 'swipesuccess.'+name, function(){
				data.forced = true;
				P.showSlide( data.selected + touchData.direction, options.speed );
			})
			.on( 'swipefail.'+name, function(){
				data.forced = true;
				P.showSlide( data.selected, options.speed );
			});
			
		},
		
		
		
		// ----- TRANSITION: SCROLL -----
		scroll: function( element, slides, options, data ) {
			
			// Init vars
			var P = this;
			var slider = P.createContainer();
			var allSlides = slides;
			var allTotal = allSlides.length;
			var outOfRange = false;
			var loop = ( options.loop && !data.touch );
			var touchData = data.touchData;
			
			// Duplicate slides for loops
			if( loop ) {
				var clones1 = slides.clone().prependTo( slider );
				var clones2 = slides.clone().appendTo( slider );
				allSlides = allSlides.add( clones1 ).add( clones2 );
				allTotal = allSlides.length;
			}
			
			// Setup styles
			if( element.css('position')=='static' ) {
				element.css( 'position', 'relative' );
			}
			slider.css({ position:'relative', left:0, top:0, width:( allTotal * 100 )+'%' });
			var slidesWidth = ( 100 / allTotal ).toFixed( 2 );
			allSlides.css({ float:'left', width:slidesWidth+'%' });
			
			
			// Function to move the slider
			function transitionTo( target, speed ) {
				var left;
				if( data.csstransforms3d && data.csstransitions ) {
					left = ( target / allTotal * -100 ) + '%';
					var translate = (data.touch) ? 'translate3d('+left+',0,0)' : 'translateX('+left+')';
					slider.css({ 'transform':translate, 'transition-duration':speed+'ms' });
				} else {
					left = ( target * -100 ) + '%';
					slider.animate({ left:left },{ duration:speed });
				}
			}
			
			// Bind events listeners
			element
			.on( 'slidestart.'+name, function(){
				var target = data.selected;
				outOfRange = false;
				if( loop ) {
					target += data.total;
					if( (data.selected - data.previous) * data.loopDir < 0 ) {
						target += data.total * data.loopDir;
						outOfRange = true;
					}
				}
				transitionTo( target, data.speed )
			})
			.on( 'slideend.'+name, function(){
				if( loop && outOfRange ) {
					var target = data.selected + data.total;
					transitionTo( target, 0 );
				}
			})
			.on( 'touchstart.'+name, function(){
				P.stopSlides();
			})
			.on( 'touchmove.'+name, function(){
				if( !touchData.isVertical ) {
					var target = data.selected + ( touchData.swipeX / -touchData.resistance );
					transitionTo( target, 0 );
				}
			})
			.on( 'swipesuccess.'+name, function(){
				data.forced = true;
				P.showSlide( data.selected + touchData.direction, options.speed );
			})
			.on( 'swipefail.'+name, function(){
				transitionTo( data.selected, options.speed );
			});
		}
	};
	
	
	
})(jQuery,window);