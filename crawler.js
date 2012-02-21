var util = require( "util" );
var http = require( "http" );
var fs = require( "fs" );

//var urlRegExp = /http:\/\/[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)+(:[0-9]+)?(\/[a-zA-Z0-9_%/:.=@#\-()]*)*(\?[a-zA-Z0-9_%/:/@#\-()]+=[a-zA-Z0-9_%/:/@#\-()]+)*/gi;
var urlRegExp = /(http:\/\/[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)+(:[0-9]+)?(\/[a-zA-Z0-9_%/:.=@#\-()]*)*(\?[a-zA-Z0-9_%/:/@#\-()]+=[a-zA-Z0-9_%/:/@#\-()]+)*)|(\.?(\/[a-zA-Z0-9_%/=@#\-]+){2,})/gi;
var urlQueue = new Array();
var maxLoadings = 5;
var numLoadings = 0;
var requestInterval = 100;
var imgMinSize = 50000;
var imgMaxSize = 0;
var urlHistory = new Array();
var logStream = fs.createWriteStream( "./log", {flags: "a", encoding: "UTF-8", mode: 0666} );

log( ":: Image Crawler v1.0.0 by. Xoul ::" );

var firstURL = process.argv[2];
if( !firstURL )
{
	log( "[ERROR] usage : node crawler.js FIRST_URL" );
	process.exit( 0 );
}

startCrawling( firstURL );

function startCrawling( firstURL )
{
	urlQueue.push( firstURL );
	setInterval( load, requestInterval );
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
		port: 80
	};
	
	var fileName = "./imgs/" + reqURL.pathname.split( "/" ).pop();
	
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
			// 50KB
			if( data.headers['content-length'] < imgMinSize )
				return;
			
			var imgData = "";
			
			data.setEncoding( "binary" );
			data.on( "data", function( chunk )
			{
				imgData += chunk;
			} );
			
			data.on( "end", function()
			{
				log( "[IMAGE] " + fileName );
				fs.writeFile( fileName, imgData, "binary" );
				
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
				parseHTML( html, options.host, options.path );
			} );
		}
	} ).on( "error", function( e )
	{
		log( "[ERROR] " + e );
		numLoadings --;
	} );
}

function parseHTML( html, host, path )
{
	var urls = html.match( urlRegExp );
	if( !urls ) return;
	
	for( var i = 0; i < urls.length; i++ )
	{
		var url = urls[i];
		var firstChar = url.substr( 0, 1 );
		
		if( firstChar == "." )
		{
			url = "http://" + host + path + url.substring( 1, url.length );
		}
		else if( firstChar == "/" )
		{
			url = "http://" + host + url;
		}
		
		if( urlHistory.indexOf( url ) == -1 )
			urlQueue.push( url );
	}
	return;
}

function log( message )
{
	logStream.write( message + "\n" );
	util.puts( message );
}

function debug( object )
{
	util.debug( util.inspect( object ) );
}
