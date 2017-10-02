/*

Accessible Carousels
based on: http://www.w3.org/WAI/tutorials/carousels/

===== SCRIPT =====

Slides
	•	Slides hidden visually should also be hidden for screen readers
	•	Current slide must have an aria-live=”polite” attribute
	•	Other slides must have an aria-hidden=”true” attribute
	•	If you want to change focus to a slide
		◦	Add tabindex=”-1″ to the slide
		◦	Trigger its focus event

Buttons
	•	Slide controls should be <button> or <a href=”#” role=”button”> 
	•	When changing the text, only replace the contents, don’t replace the button entirely as this would make keyboard users lose focus 
	•	Distinct styling for :hover and :focus states 

Prev / Next
	•	When disabled: 
		◦	Distinct styling 
		◦	tabindex="-1"

Play / Stop
	•	Change text depending on status 
	•	Pause slider automatically when an element inside the slider gains focus 

Nav Items
	•	When an item represents the current slide: 
		◦	Add extra text to indicate this 
		◦	Distinct styling 
	•	When clicked, change the focus to the selected slide (not sure if this is actually good) 


===== MARKUP =====

Settings
	•	Autoplay enabled by default only if there’s a button to pause it 
	•	Time between transitions must be enough to read all the content 
	•	Make sure slider pauses when it gains keyboard focus 

Heading
	•	Add a heading that describes the slider (can be visuallyhidden) 
	•	Add role=”region” and aria-labelledby attributes to slider 
	•	aria-labelledby of the slider and the id of the heading must match 

Slides
	•	<ul> with <li> if slides contain simple content (e.g. just an image and short text), or if their content is related (e.g. all are news items) 
	•	<article> for more complex content and if they are independent pieces of content (e.g. one is a news item, one is a link to a page, one is a shop offer…) 

Controls
	•	Nav items must be a <ul> with <li> 

General Checks
	•	Make sure it’s still readable with JS disabled 
	•	Mark images with alt text 
	•	Check colour contrast 
	•	Add :hover and :focus styles to links, buttons 
	•	etc… 

*/