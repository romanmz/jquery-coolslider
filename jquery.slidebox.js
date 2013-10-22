/*!
 * Slidebox v1.01
 * http://github.com/romanmz/slidebox
 * By Roman Martinez - http://romanmz.com
 * MIT License
 */

// ------------------------- SLIDEBOX -------------------------
// ------------------------------------------------------------
;(function($,window,undefined){
	
	
	
	// ----- PRIVATE DATA -----
	var version = '1.01'; // 2013/10/22
	var name = 'slidebox';
	var defaults = {
		type: 'fade',			// 'fade', 'scroll'
		slides: '> *',			// css selector
		timer: 8000,			// milliseconds (time before changing slides when autoplay is on)
		speed: 500,				// milliseconds (speed of transition between slides)
		showFirst: 'random',	// number or 'random'
		visualTimer: false,		// false or css selector
		
		loop: false,			// true or false
		autoplay: false,		// true or false
		keyboard: true,			// true or false
		swipe: 'scroll',		// false or 'scroll'
		
		selectedSlideClass: 'selected',
		previousSlideClass: 'previous',
		controlsDisabledClass: 'disabled',
		controlsPausedClass: 'paused',
		controlsSelectedClass: 'selected',
		
		addControls: true,		// true, false, 'before', 'after', 'prepend', 'append', css selector (true defaults to 'prepend')
		controls: '<div class="slidebox-controls"><h3>Slideshow controls</h3><p>Currently showing slide {{current}} of {{total}}</p/><ul>{{prevLink}}{{playLink}}{{pauseLink}}{{nextLink}}</ul><ol>{{navLinks}}</ol></div>',
		prevLink: '<li class="slidebox-controls-prev"><a href="#">&laquo;<span class="default-text"> Previous slide</span><span class="alt-text"> Showing first slide</span></a></li>',
		nextLink: '<li class="slidebox-controls-next"><a href="#"><span class="default-text">Next slide </span><span class="alt-text">Showing last slide </span>&raquo;</a></li>',
		playLink: '<li class="slidebox-controls-play"><a href="#">▶<span> Play slideshow</span></a></li>',
		pauseLink: '<li class="slidebox-controls-pause"><a href="#">■<span> Pause slideshow</span></a></li>',
		navLinks: '<li class="slidebox-controls-number"><a href="#"><span class="default-text">Show slide </span><span class="alt-text">Showing slide </span>{{title}}</a></li>',
		
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
				touch: ('ontouchstart' in window || navigator.msMaxTouchPoints > 0),
				selectedSlide: $(),
				previousSlide: $(),
				otherSlides: $(),
				visualTimer: (options.visualTimer) ? $(options.visualTimer) : $(),
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
			
			// Get type of slider and initialize it
			type = (data.touch && typeof options.swipe == 'string') ? options.swipe : options.type;
			if( typeof type === 'string' && typeof $.fn[name].transitions[type] === 'function' ) {
				type = $.fn[name].transitions[type];
			} else if( typeof type !== 'function' ) {
				$.error( name+'(): type of slider is not defined' );
			}
			type.call( P, element, slides, options, data );
			
			// Run other initializers
			options.init.call( P, element, slides, options, data );
			P.createControls();
			P.showSlide( options.showFirst-1, 0 );
			
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
		
		
		
		// ----- CREATE CONTROLS -----
		createControls: function() {
			
			// Validate
			if( this.controls || !this.options.addControls ) {
				return;
			}
			
			// Set vars
			var P = this, options = P.options, data = P.data;
			var templates = { controls:'', prevLink:'', nextLink:'', playLink:'', pauseLink:'', navLinks:'' };
			var controls;
			var navLinks;
			
			// Markup variables
			for( var key in templates ) {
				templates[key] = options[key].replace( /\{\{([^}]+)\}\}/g, '<span data-replace-with="$1">$1</span>' );
			}
			P.controls = controls = $( templates.controls );
			
			// Create controls
			for( var key in templates ) {
				switch( key ) {
					case 'prevLink': case 'nextLink': case 'playLink': case 'pauseLink':
						controls[key] = $( templates[key] );
						controls.find( '[data-replace-with="'+key+'"]').replaceWith( controls[key] );
						break;
				}
			}
			if( !data.playing ) {
				controls.playLink.addClass( options.controlsPausedClass );
				controls.pauseLink.addClass( options.controlsPausedClass );
			}
			
			// Create numbered navigation
			navLinks = $();
			for( var i=1; i<=data.total; i++ ) {
				var navLink = $( templates['navLinks'] );
				var title = P.slides.eq( i-1 ).data( 'slide-title' );
				if( !title ) title = i;
				navLink.find( '[data-replace-with=title]' ).text( title ).contents().unwrap();
				navLink.find( '[data-replace-with=number]' ).text( i ).contents().unwrap();
				navLinks = navLinks.add( navLink );
			}
			controls.find( '[data-replace-with="navLinks"]' ).replaceWith( navLinks );
			controls.navLinks = navLinks;
			
			// Insert into DOM
			switch( options.addControls ) {
				case true:
					options.addControls = 'before';
				case 'before':
				case 'after':
				case 'prepend':
				case 'append':
					P.element[options.addControls]( controls );
					break;
				default:
					$( options.addControls ).append( controls );
					break;
			}
			
			// Bind events listeners
			P.element.on( 'slidestart.'+name, function(){
				P.updateControls();
			});
			controls.prevLink.find('a').on( 'click.'+name, function(){
				P.showPrevious();
				return false;
			});
			controls.nextLink.find('a').on( 'click.'+name, function(){
				P.showNext();
				return false;
			});
			controls.playLink.find('a').on( 'click.'+name, function(){
				P.playSlides();
				return false;
			});
			controls.pauseLink.find('a').on( 'click.'+name, function(){
				P.stopSlides();
				return false;
			});
			controls.navLinks.find('a').on( 'click.'+name, function(){
				data.loopDir = 0;
				P.showSlide( P.controls.navLinks.children('a').index( $(this) ) );
				return false
			});
			
		},
		updateControls: function() {
			
			var P = this, data = P.data, options = P.options, controls = P.controls;
			
			// Reset Prev/Next
			var prevClass = (options.loop || data.selected > 0) ? 'removeClass' : 'addClass';
			controls.prevLink[prevClass]( options.controlsDisabledClass );
			var nextClass = (options.loop || data.selected < data.total-1) ? 'removeClass' : 'addClass';
			controls.nextLink[nextClass]( options.controlsDisabledClass );
			
			// Reset Numbers
			controls.navLinks.removeClass( options.controlsSelectedClass ).eq( data.selected ).addClass( options.controlsSelectedClass );
			controls.find('[data-replace-with=current]').text( data.selected+1 );
			controls.find('[data-replace-with=total]').text( data.total );
			
		},
		
		
		
		// ----- SLIDING FUNCTIONS -----
		showSlide: function( number, speed ) {
			
			var P = this, element = P.element, slides = P.slides, data = P.data, options = P.options;
			var loop = options.loop;
			var last = data.total-1;
			
			// Defaults
			if( typeof speed === 'undefined' ) speed = options.speed;
			
			// Validate
			number = (number>last) ? (loop) ? 0 : last : (number<0) ? (loop) ? last : 0 : number;
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
				controls.playLink.addClass( options.controlsPausedClass );
				controls.pauseLink.addClass( options.controlsPausedClass );
			}
			data.playing = false;
			data.forced = true;
			P.showSlide( data.selected, 0 );
			
		},
		playSlides: function() {
			
			var P = this, data = P.data, controls = P.controls, options = P.options;
			if( controls ) {
				controls.playLink.removeClass( options.controlsPausedClass );
				controls.pauseLink.removeClass( options.controlsPausedClass );
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
			
			// Create container and placeholder
			var container = this.createContainer();
			slides.first().clone().insertBefore( slides.first() ).css({ visibility:'hidden' });
			
			// Setup styles
			container.css({ position:'relative' });
			slides.css({ position:'absolute', left:0, top:0, zIndex:0, width:'100%' }).hide();
			
			// Bind events listeners
			element
			.on( 'slidestart.'+name, function(){
				data.selectedSlide.css({ zIndex:1 }).fadeIn( data.speed );
				if( options.simultaneous ) {
					data.previousSlide.fadeOut( data.speed );
				}
			})
			.on( 'slideend.'+name, function(){
				data.selectedSlide.css({ zIndex:0 });
				data.previousSlide.hide();
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
			var useTouch = ( options.swipe && data.touch );
			var loop = ( options.loop && !useTouch );
			var touchData = data.touchData;
			//slides.css({ 'user-select': 'none' });
			//slider.find('*').css({ '-webkit-backface-visibility':'hidden' });
			
			// Duplicate slides for loops
			if( loop ) {
				var clones1 = slides.clone().prependTo( slider );
				var clones2 = slides.clone().appendTo( slider );
				allSlides = allSlides.add( clones1 ).add( clones2 );
				allTotal = allSlides.length;
			}
			
			// Setup styles
			slider.css({ position:'relative', left:0, top:0, width:( allTotal * 100 )+'%' });
			allSlides.css({ float:'left', width:( 100 / allTotal )+'%' });
			
			// Function to move the slider
			function transitionTo( target, speed ) {
				var left;
				if( data.csstransforms3d && data.csstransitions ) {
					left = ( target / allTotal * -100 ) + '%';
					slider.css({ 'transform':'translate3d( '+left+',0,0 )', 'transition-duration':speed+'ms' });
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
				
			});
			if( useTouch ) {
				element
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
					
					var direction = (touchData.deltaX < 0) ? 1 : -1;
					data.forced = true;
					P.showSlide( data.selected + direction, options.speed );
					
				})
				.on( 'swipefail.'+name, function(){
					
					transitionTo( data.selected, options.speed );
					
				})
			}
		}
	};
	
	
	
})(jQuery,window);