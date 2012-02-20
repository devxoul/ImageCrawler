var util = require( "util" );
var request = require( "request" );
var fs = require( "fs" );
var http = require( "http" );
var path = require( "path" );

var imgRegExp = /(https?:\/\/)[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)+(:[0-9]+)?(\/[a-zA-Z0-9_%?/:&.=@#\-()]*)*((.png)|(.jpg)|(.jpeg)|(.bmp))/gi;
var urlRegExp = /(https?:\/\/)[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)+(:[0-9]+)?(\/[a-zA-Z0-9_%?/:&.=@#\-()]*)*\/[a-zA-Z0-9_%?/:&=@#\-()]*/gi;

var urlQueue = new Array();
//urlQueue.push( 'http://www.google.co.kr/search?q=아이유' );
urlQueue.push( 'http://www.google.co.kr/search?q=아이유&tbm=isch' );

crawl();

function crawl()
{
	if( urlQueue.length == 0 )
	{
		util.puts( "Finish" );
		process.exit( 0 );
	}
	
	var url = urlQueue.shift();
	
	util.puts( "(" + urlQueue.length + ") " + url );
	
	request( url, function( error, response, body )
	{
		if( error || !body )
		{
			crawl();
			return;
		}
		
		var imgs = body.match( imgRegExp ) || new Array();
		for( var i = 0; i < imgs.length; i++ )
		{
			var imgURL = require( "url" ).parse( imgs[i] );
			
			/*var fileName = "./imgs/" + imgURL.pathname.split( "/" ).pop();
			path.exists( fileName, function( exists )
			{
				if( exists )
				{
					util.puts( "EXISTS!!!" );
					fileName += "(2)";
				}
			} );*/
			
			var options = {
				host: imgURL.hostname,
				path: imgURL.pathname,
				port: 80,
				dest: "./imgs/" + imgURL.pathname.split( "/" ).pop()
			};
			
			http.get( options, function( data )
			{
				if( data.headers['content-length'] < 50000 ) return;
				
				data.setEncoding( "binary" );
				var imgData = "";
				data.on( "data", function( chunk )
				{
					imgData += chunk;
				} );
				
				data.on( "end", function()
				{
					fs.writeFile( options.dest, imgData, "binary" );
				} );
			} );
		}
		
		var urls = body.match( urlRegExp ) || new Array;
		for( var i = 0; i < urls.length; i++ )
		{
			urlQueue.push( urls[i] );
		}
		
		crawl();
	} );
}

/*function getCurrentDate()
{
	var date = new Date();
	var year = date.getFullYear();
	var month = date.getMonth() + 1;
	if( month < 10 ) month = "0" + month;
	var day = date.getDate();
	if( day < 10 ) day = "0" + day;
	var hours = date.getHours();
	if( hours < 10 ) hours = "0" + hours;
	var minutes = date.getMinutes();
	if( minutes < 10 ) minutes = "0" + minutes;
	var seconds = date.getSeconds();
	
	return String( year ) + month + day + hours + minutes + seconds;
}*/
