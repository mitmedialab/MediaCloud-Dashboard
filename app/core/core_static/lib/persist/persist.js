// Persist headers
// See https://css-tricks.com/persistent-headers/
(function () {
  function UpdateTableHeaders() {
     $(".persist-area").each(function() {
     
	 var el             = $(this),
	     offset         = el.offset(),
	     scrollTop      = $(window).scrollTop(),
	     floatingHeader = $(".floating-header", this)
	 
	 if ((scrollTop > offset.top) && (scrollTop < offset.top + el.height())) {
	     floatingHeader.css({
	      "visibility": "visible"
	     });
	 } else {
	     floatingHeader.css({
	      "visibility": "hidden"
	     });      
	 };
     });
  }
  
  // DOM Ready      
  $(function() {
  
  	 if(App.config.persistHeader==false) return;	// allow user to control where row persists or not

     var clonedHeaderRow;
  
     $(".persist-area").each(function() {
	 clonedHeaderRow = $(".persist-header", this);
	 clonedHeaderRow
	   .before(clonedHeaderRow.clone())
	   .css("width", clonedHeaderRow.width())
	   .addClass("floating-header");
	   
     });
     
     $(window)
      .scroll(UpdateTableHeaders)
      .trigger("scroll");
     
  });
})();
