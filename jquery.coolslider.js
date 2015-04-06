/*
 * coolslider v3.0
 * http://github.com/romanmz/coolslider
 * By Roman Martinez - http://romanmz.com
 */

;( function( $, window, document, undefined ){
	
	
	// ----- Private Data -----
	var defaults = {
		type:		'tabs',
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
