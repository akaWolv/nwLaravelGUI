(function(){
	var phpArtisan = function(command, optionalArgs, config, callback) {

		var commandChunks = ['/usr/local/bin/php artisan', command]; 
		if (undefined !== optionalArgs && optionalArgs.length > 0) {
			commandChunks.push(optionalArgs);
		}
		if (undefined !== config && config.length > 0) {
			commandChunks.push('--env=' + config);
		}
		var fullCommand = commandChunks.join(' ')

		exec(
			fullCommand, 
			{cwd: '/data/www/grant_system'},
			function (err, stdout, stderr) {
				callback(err, stdout, stderr, fullCommand) 
			}
		);
	};
	window.phpArtisan = phpArtisan;

	class CommandRunner extends React.Component {
		constructor(props) {
			super(props);
			this.state = {
				fullCommand: '',
				response: new Array(),
				responseError: false,
				shouldRenderOutputResponse: false,
				shouldRenderProgressBar: false,
				optionalArgs: ''
			};
		}
		runCommand(config) {
			this.setState({
				response: new Array(),
				responseError: false, 
				shouldRenderOutputResponse: false, 
				shouldRenderProgressBar: true
			});
			phpArtisan(
				this.props.command, 
				this.state.optionalArgs,
				config, 
				function (err, stdout, stderr, fullCommand) {
					var newState = this.state.response,
						responseError = false;
					console.log({
						'err': err,
						'stdout': stdout,
						'stderr': stderr
					});
					var emptyResponse = true;
					if (null !== err) {
						console.error(err);
						responseError = true;
					}
					if (stdout.length > 0) {
						newState.push(stdout);
					}
					if (stderr.length > 0) {
						newState.push(stderr);
					}

					if (null === err && 0 === stdout.length && 0 === stderr.length) {
						newState.push('- empty reposne -');
					}

					this.setState({
						fullCommand: '$ ' + fullCommand,
						response: newState,
						responseError: responseError,
						shouldRenderOutputResponse: true, 
						shouldRenderProgressBar: false
					});
				}.bind(this)
			);
		}
		clearResponse() {
			this.setState({
				fullCommand: '',
				response: new Array(),
				responseError: false,
				shouldRenderOutputResponse: false, 
				shouldRenderProgressBar: false
			});
		}
		handleOptionalArgsChange(event) {
		    this.setState({optionalArgs: event.target.value});
		}
		renderInput() {
			return React.createElement(
				'div',
				{className: 'input-group mb-3'},
				React.createElement(
					'span',
					{className: 'input-group-addon'},
					'$ ' + this.props.command
				),
				React.createElement(
					'input',
					{
						className: 'form-control', 
						type: 'text', 
						placeholder: 'optional args',
						value: this.state.optionalArgs,
						onChange: this.handleOptionalArgsChange.bind(this)
					}
				)
			);
		}
		renderButtons() {
			return React.createElement(
				'div',
				null,
				this.props.environments.map(function(env) {
					return React.createElement(
						'button', 
						{
							className: 'card-link btn btn-primary btn-sm', 
							onClick: this.runCommand.bind(this, env.env)
						}, 
						'Run for ',
						React.createElement('b', null, env.file)
					)
				}.bind(this))
			); 
			
		}
		renderProgressBar() {
			return this.state.shouldRenderProgressBar
				? React.createElement(
					'div',
					{className: 'progress mt-3'},
					React.createElement(
						'div',
						{
							className: 'progress-bar progress-bar-striped progress-bar-animated w-100', 
							role: 'progressbar'
						},
					)
				)
				: null;
		}
		renderOutputResponse() {
			return this.state.shouldRenderOutputResponse 
				? React.createElement(
					'div', 
					{
						className: 'card text-white bg-dark mt-3'
					},
					React.createElement(
						'div',
						{className: 'card-header text-white', style: {borderBottom: this.state.responseError ? 'solid 1px red' : 'solid 1px green'}},
						React.createElement('small', null, this.state.fullCommand)
					),
					React.createElement(
						'div', 
						{className: 'card-body'},  
						React.createElement(
							'pre', 
							{className: 'card-text text-white'}, 
							this.state.response.map(function (i) {
								return React.createElement('div', {className: 'w-100'}, i)
							})
						)
					),
					React.createElement(
						'button',
						{className: 'btn btn-secondary btn-sm', onClick: this.clearResponse.bind(this)},
						'close'
					),
				)
				: null; 
		}
 		render() {
			return React.createElement(
				'div',
				{className: 'mt-3'},
				this.renderInput(this),
				this.renderButtons(this),
				this.renderProgressBar(this),
				this.renderOutputResponse(this)
			);
		}
	};

	class CommandList extends React.Component {
		constructor(props) {
			super(props);
			this.state = {
				parsedCommandList: new Array(),
				parsedEnvironments: new Array()
			};
		}
		componentDidMount() {
			exec('/usr/local/bin/php artisan', {cwd: '/data/www/grant_system'}, function (err, stdout, stderr) {
				if (0 === stdout.length) {
					return console.error('Stdout empty.');
				}

				var availableCommand = stdout.split('Available commands:')[1];
			    if (0 === availableCommand.length) {
					return console.error('Non well formatted stoudt');   
			    }

			    var commandsList = availableCommand.split("\n");
			    var parsedCommandList = commandsList.map(function(i) {
			    	var nonEmptyElements = i.split(' ').filter(function(f){ return f.length > 0; })
			    	if (nonEmptyElements.length > 1) {
			    		return {command: nonEmptyElements.shift(), description: nonEmptyElements.join(' ') };
			    	}
			    }).filter(function(f){ return undefined !== f;});

			    this.setState({parsedCommandList: parsedCommandList});
			}.bind(this));

			var parsedEnvironments = new Array();	
			var files = fs.readdirSync('/data/www/grant_system');
			files.map(function (f) {
				if (f.match(/\.env(\.*)?/) && ['.env.prod', '.env.example'].indexOf(f) === -1) {
					parsedEnvironments.push({
						file: f,
						env: f.replace('.env', '').replace('.', '')
					});
				}
			});
			this.setState({parsedEnvironments: parsedEnvironments});	
		}
 		render() {
			return React.createElement(
				'div', 
				{className: 'w-100'}, 
				React.createElement(
					'div',
					{id: 'commandList', role: 'tablist'},
					this.state.parsedCommandList.map(function(e, key){
						var splitCommand = e.command.split(':'),
							prefix = undefined != splitCommand[1] ? splitCommand[0] : '',
							postfix = undefined != splitCommand[1] ? splitCommand[1] : splitCommand[0];

						return React.createElement(
							'div',
							{className: 'card w-100', role: 'tab'},
							React.createElement(
								'div', 
								{className: 'card-header btn-group'}, 
								prefix.length > 0 
									? React.createElement('button', {className:'btn btn-secondary disabled', href: '#cc-' + key, 'data-toggle': 'collapse'}, prefix)
									: null,
								React.createElement('a', {className:'btn btn-outline-primary', href: '#cc-' + key, 'data-toggle': 'collapse'}, postfix)
							),	
							React.createElement(
								'div', 
								{id: 'cc-' + key, className: 'collapse'},
								React.createElement(
									'div',
									{className: 'card-body ', role: 'tabpanel'},
									React.createElement('small', {className: 'card-text text-muted'}, e.description),
									React.createElement(CommandRunner, {command: e.command, environments: this.state.parsedEnvironments})
								),
							)
						);
					}.bind(this))
				)
			);
		}
	}

	class AppHeader extends React.Component {
		render() {
			return React.createElement(
				'nav',
				{className: 'navbar navbar-light bg-dark'},
				React.createElement(
					'div',
					{className: 'navbar-brand text-white'},
					React.createElement(
						'img',
						{src: './icon-64.png', className: 'd-inline-block align-top mr-2', style: {width: 30, height: 30}}
					),
					'Laravel GUI ',
					React.createElement('small', {className: 'text-muted'})
				)
			);
		}
	}

	class AppFooter extends React.Component {
		render() {
			return React.createElement(
				'nav',
				{className: 'navbar navbar-light bg-dark text-center'},
				React.createElement(
					'div',
					{className: 'navbar-brand text-center text-white w-100'},
					React.createElement('small', {className: 'text-muted'}, 'Laravel GUI v0.1'),
					React.createElement('span', {className: 'text-muted'}, ' | '),
					React.createElement('a', {href: '#', onClick: function (event) { event.preventDefault(); gui.Window.open('https://github.com/akaWolv/nwLaravelGUI') }}, React.createElement('small', {className: 'text-muted'}, 'GitHub'))
				)
			);
		}
	}

	ReactDOM.render(
		React.createElement(
	  		'div', 
	  		null,
	  		React.createElement(AppHeader),
			React.createElement(CommandList),	
	  		React.createElement(AppFooter)
  		),
	 	document.getElementById('root')
	);

})( window );