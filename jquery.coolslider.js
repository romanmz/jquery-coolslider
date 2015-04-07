/*
 * coolslider v3.01
 * http://github.com/romanmz/coolslider
 * By Roman Martinez - http://romanmz.com
 */

;( function( $, window, document, undefined ){
	
	
	// ----- Private Data -----
	var defaults = {
		type:	'scroll',
	};
	
	
	// ----- Features Detection -----
	function detectTranslate3D() {
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
	function detectTransition() {
		var s = document.createElement('p').style;
		var supportsTransitions =	'transition' in s ||
									'WebkitTransition' in s ||
									'MozTransition' in s ||
									'msTransition' in s ||
									'OTransition' in s;
		return supportsTransitions;
	}
	
	
	// ----- Create Placeholder -----
	function createPlaceholder( slides ) {
		
		// Create objects
		var placeholder = $('<div>').css({ visibility: 'hidden', overflow: 'hidden' });
		var innerPlaceholder = $('<div>').css({ width: ( slides.length * 100 )+'%' });
		var slidesClones = slides.clone().css({ float: 'left', width: ( 100 / slides.length )+'%' });
		
		// Append to DOM
		placeholder.insertBefore( slides.first() );
		innerPlaceholder.appendTo( placeholder );
		slidesClones.appendTo( innerPlaceholder );
		
		// Return
		return placeholder;
	}
	
	
	
	// ----- Effects -----
	var effects = {
		
		
		
		// --------------------------------------------------
		// Tabs
		// --------------------------------------------------
		tabs: function( API, settings, slider, slides, data ) {
			
			// Override settings
			settings.speed	= 0;
			
			// Functions
			var showCurrent = function(){
				slides.hide().eq( data.current ).show();
			}
			var destroy = function(){
				slides.removeAttr( 'style' );
			}
			
			// Bind functions to events
			slider
			.on( 'slideshowchangestart', showCurrent )
			.on( 'slideshowdestroy', destroy );
			
		},
		
		
		
		// --------------------------------------------------
		// Fade
		// --------------------------------------------------
		fade: function( API, settings, slider, slides, data ) {
			
			
			// Init vars
			var usingTouch		= ( typeof $.fn.addTouchEvents == 'function' && data.usingTouch );
			var placeholder		= $();
			var wrapper			= $();
			var currentSlide	= $();
			var otherSlides		= $();
			var animationTimer;
			var touchData;
			
			
			// ----- Init / Destroy -----
			function init(){
				
				// Select objects
				placeholder = createPlaceholder( slides );
				wrapper = slides.parent();
				
				// Setup styles
				if( wrapper.css( 'position' ) == 'static' ) {
					wrapper.css( 'position', 'relative' );
				}
				slides.css({
					position:	'absolute',
					left:		0,
					top:		0,
					right:		0,
					bottom:		0,
					transition:	'none',
					
					opacity:	0,
					zIndex:		0,
					display:	'none',
				});
				
			}
			function destroy(){
				
				placeholder.remove();
				wrapper.removeAttr( 'style' );
				slides.stop( true, true ).removeAttr( 'style' );
				clearTimeout( animationTimer );
				
			}
			
			
			// ----- Transitions -----
			function transitionTo( slideIn, slideOut, ratio, speed ) {
				
				slides.stop( true, true );
				if( !speed ) {
					slideIn.css({ opacity:ratio });
					slideOut.css({ opacity:1-ratio });
				} else {
					slideIn.fadeTo( speed, ratio );
					animationTimer = setTimeout(function(){
						slideOut.fadeTo( speed/2, 1-ratio );
					}, speed/2 );
				}
				
			}
			function changeStart(){
				
				currentSlide	= slides.eq( data.current ).css({ zIndex: 1, display:'block' });
				otherSlides		= slides.not( currentSlide ).css({ zIndex: 0 });
				transitionTo( currentSlide, otherSlides, 1, data.speed );
				
			}
			function changeEnd(){
				
				otherSlides.css({ display:'none' });
				
			}
			
			
			// ----- Touch Events -----
			if( usingTouch ) {
				touchData = slider.addTouchEvents().data( 'touchdata' );
				function touchStart(){
					
					API.stop();
					
				}
				function touchMove(){
					if( touchData.initDir == 'x' ) {
						
						var nextNumber	= API.restrictNumber( data.current - touchData.directionX );
						var nextSlide	= slides.eq( nextNumber ).not( currentSlide );
						if( nextSlide.length ) {
							
							var ratio = 1 - Math.abs( touchData.movedRelX );
							nextSlide.css({ display:'block' });
							transitionTo( currentSlide, nextSlide, ratio, 0 );
							
						}
						e.preventDefault();
						
					}
				}
				function swipe(){
					if( touchData.initDir == 'x' ) {
						
						API.showSlide( data.current - touchData.directionX );
						
					}
				}
				function swipeFail(){
					if( touchData.initDir == 'x' ) {
						
						API.showSlide( data.current, undefined, undefined, true );
						
					}
				}
			}
			
			
			// ----- Bind Functions -----
			slider
			.on( 'slideshowinit', init )
			.on( 'slideshowdestroy', destroy )
			.on( 'slideshowchangestart', changeStart )
			.on( 'slideshowchangeend', changeEnd )
			if( usingTouch ) {
				slider
				.on( 'touchstart', touchStart )
				.on( 'touchmove', touchMove )
				.on( 'swipe', swipe )
				.on( 'swipefail', swipeFail );
			}
		},
		
		
		
		// --------------------------------------------------
		// Scroll
		// --------------------------------------------------
		scroll: function( API, settings, slider, slides, data ) {
			
			
			// Init vars
			var usingTouch		= ( typeof $.fn.addTouchEvents == 'function' && data.usingTouch );
			var hasTranslate3D	= detectTranslate3D();
			var hasTransition	= detectTransition();
			var placeholder		= $();
			var wrapper			= $();
			var clones1			= $();
			var clones2			= $();
			var allSlides		= slides;
			var touchData;
			var outOfRange;
			var resistance;
			
			
			// ----- Init / Destroy -----
			function init(){
				
				// Select objects
				placeholder = createPlaceholder( slides );
				wrapper = slides.parent();
				
				// Create clones for looping
				if( settings.loop ) {
					clones1		= slides.clone().insertBefore( slides.first() );
					clones2		= slides.clone().insertAfter( slides.last() );
					allSlides	= clones1.add( slides ).add( clones2 );
				}
				
				// Setup styles
				if( wrapper.css( 'position' ) == 'static' ) {
					wrapper.css( 'position', 'relative' );
				}
				allSlides.css({
					position:	'absolute',
					top:		0,
					width:		'100%',
					height:		'100%'
				}).each(function(i){
					var left = ( i - clones1.length ) * 100;
					$(this).css( 'left', ( left )+'%' );
				});
				clones1.add( clones2 ).attr( 'aria-hidden', 'true' );
				
			}
			function destroy(){
				
				placeholder.remove();
				clones1.add( clones2 ).remove();
				wrapper.removeAttr( 'style' );
				slides.stop( true, true ).removeAttr( 'style' );
				
			}
			
			
			// ----- Transitions -----
			function transitionTo( target, speed ) {
				
				var left = ( target * -100 )+'%';
				if( hasTranslate3D && hasTransition ) {
					allSlides.css({
						transform:	'translate3d('+left+',0,0)',
						transition:	'all '+speed+'ms'
					});
				} else {
					allSlides.animate({ marginLeft: left }, speed );
				}
				
			}
			function changeStart(){
				
				// Calculate target
				var target = data.current;
				outOfRange = false;
				if(
					settings.loop && (
						( data.current > data.previous && data.isChanging < 0 ) ||
						( data.current < data.previous && data.isChanging > 0 )
					)
				) {
					target += data.total * data.isChanging;
					outOfRange = true;
				}
				
				// Animate
				allSlides.css({ visibility: 'visible' });
				transitionTo( target, data.speed );
				
			}
			function changeEnd(){
				
				allSlides.not( slides.eq( data.current ) ).css({ visibility: 'hidden' });
				if( outOfRange ) {
					transitionTo( data.current, 0 );
				}
				
			}
			function updateClasses() {
				
				clones1.add( clones2 ).removeClass( settings.classSelected );
				clones1.eq( data.current ).add( clones2.eq( data.current ) ).addClass( settings.classSelected );
				
			}
			
			
			// ----- Touch Events -----
			if( usingTouch ) {
				touchData = slider.addTouchEvents().data( 'touchdata' );
				function touchStart(){
					
					API.stop();
					resistance = 1;
					
				}
				function touchMove(){
					if( touchData.initDir == 'x' ) {
						
						// Add resistance
						if(
							!settings.loop &&
							(
								( data.current <= 0 && touchData.movedX > 0 ) ||
								( data.current >= data.total-1 && touchData.movedX < 0 )
							)
						) {
							resistance = Math.abs( touchData.movedX ) / touchData.areaWidth + 2;
						}
						
						// Animate
						allSlides.css({ visibility: 'visible' });
						var target = data.current + ( touchData.movedRelX / -resistance );
						transitionTo( target, 0 );
						e.preventDefault();
						
					}
				}
				function swipe(){
					if( touchData.initDir == 'x' ) {
						
						API.showSlide( data.current - touchData.directionX, settings.speed, -touchData.directionX, true );
						
					}
				}
				function swipeFail(){
					if( touchData.initDir == 'x' ) {
						
						transitionTo( data.current, settings.speed );
						
					}
				}
			}
			
			
			// ----- Bind Functions -----
			slider
			.on( 'slideshowinit', init )
			.on( 'slideshowdestroy', destroy )
			.on( 'slideshowchangestart', changeStart )
			.on( 'slideshowchangeend', changeEnd )
			.on( 'slideshowupdate', updateClasses )
			if( usingTouch ) {
				slider
				.on( 'touchstart', touchStart )
				.on( 'touchmove', touchMove )
				.on( 'swipe', swipe )
				.on( 'swipefail', swipeFail );
			}
		},
	};
	
	
	
	// --------------------------------------------------
	// Constructor
	// --------------------------------------------------
	$.fn.coolslider = function( userSettings ) {
		return this.each(function(){
			
			// Setup Slideshow
			var API			= new $.slideshow( this, $.extend( {}, defaults, userSettings, $(this).data( 'coolslider' ) ), true );
			var settings	= API.settings;
			var slider		= API.element;
			var slides		= API.slides;
			var data		= API.data;
			
			// Setup Effects
			if( typeof effects[ settings.type ] == 'function' ) {
				effects[ settings.type ]( API, settings, slider, slides, data );
			}
			
			// Init
			API.init();
			
		});
	};
	
	
} )( jQuery, window, document );
