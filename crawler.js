var util = require( "util" );
var http = require( "http" );
var fs = require( "fs" );

var urlRegExp = /http:\/\/[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)+(:[0-9]+)?(\/[a-zA-Z0-9_%/:.=@#\-()]*)*(\?[a-zA-Z0-9_%/:/@#\-()]+=[a-zA-Z0-9_%/:/@#\-()]+)*/gi;
var urlQueue = new Array();
var maxLoadings = 5;
var numLoadings = 0;
var urlHistory = new Array();

startCrawling( "http://zzo.co.kr/907" );

function startCrawling( startURL )
{
	urlQueue.push( startURL );
	setInterval( load, 10 );
}

function load()
{
	// debug( numLoadings + " : " + maxLoadings );
	if( numLoadings < maxLoadings && urlQueue.length > 0 )
		loadURL( urlQueue.shift() );
}

function loadURL( url )
{
	if( !url ) return;
	
	log( "[URL] " + url );
	
	var reqURL = require( "url" ).parse( url );
	var options = {
		host: reqURL.hostname,
		path: reqURL.pathname,
		port: 80,
		dest: "./imgs/" + reqURL.pathname.split( "/" ).pop()
	};
	
	numLoadings ++;
	
	urlHistory.push( url );
	
	http.get( options, function( data )
	{
		numLoadings --;
		
		var contentType = data.headers['content-type'];
		if( !contentType ) return;
		
		// Loaded image
		if( contentType.indexOf( "image" ) > -1 )
		{
			if( data.headers['content-length'] < 50000 )
				return;
			
			var imgData = "";
			
			data.setEncoding( "binary" );
			data.on( "data", function( chunk )
			{
				imgData += chunk;
			} );
			
			data.on( "end", function()
			{
				log( "[IMAGE] " + options.dest );
				fs.writeFile( options.dest, imgData, "binary" );
				
				numLoadings --;
			} );
		}
		
		// Loaded html page
		else if( contentType.indexOf( "text/html" ) > -1 )
		{
			var html = "";
			
			data.on( "data", function( chunk )
			{
				html += chunk;
			} );
			
			data.on( "end", function()
			{
				parseHTML( html );
			} );
		}
	} ).on( "error", function( e )
	{
		log( "[ERROR] " + e );
		numLoadings --;
	} );
}

function parseHTML( html )
{
	var urls = html.match( urlRegExp );
	if( !urls ) return;
	
	for( var i = 0; i < urls.length; i++ )
	{
		if( urlHistory.indexOf( urls[i] ) == -1 )
			urlQueue.push( urls[i] );
	}
}

function log( message )
{
	fs.createWriteStream( "./log", {
	    flags: "a",
	    encoding: "UTF-8",
	    mode: 0666
	} ).write( message + "\n" );
	
	util.puts( message );
}

function debug( object )
{
	util.debug( util.inspect( object ) );
}
