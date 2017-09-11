(function() {

var child_process = window.require('child_process')
    , exec = child_process.exec;
window.exec = exec;

window.fs = window.require('fs');

// Load native UI library
var gui = require('nw.gui');
window.gui = gui;
// Create a tray icon
var tray = new gui.Tray({ icon: 'icon-16.png' });
// Give it a menu
var menu = new gui.Menu();
var itemDefinitionList = [
	{command: 'migrate:fresh', config: 'local'},
	{command: 'db:seed', config: 'local'}
]
itemList = [];
itemList = itemDefinitionList.map(function (item) {
 return new gui.MenuItem({
	  label: item.command,
	  click: function() {
	    phpArtisan(item.command, '', item.config, function(err, stdout, stderr){
	    	var options = {
			    icon: null === err ? 'ok.png' : 'error.png',
			    body: null === err ? 'Processed' : ':( Sorry, some errors occured!'
			};
				
			var notification = new Notification(item.command, options);
			notification.onclick = notification.close;
			notification.onshow = function () {
			    // auto close after 1 second
			    setTimeout(function() {notification.close();}, 3000);
			}

	    });
	  }
	});
})

for (var k in itemList) {
	// Bind a callback to item
	menu.append(itemList[k]);	
}
tray.menu = menu;

})( window );