<p align="center">
  <img src="botlerplate.png" />
</p>


## Synopsis

The Botlerplate allows you to start your project with strong bases.

## Installation

### Manual install

```bash
git clone https://github.com/RecastAI/botlerplate
cd botlerplate
npm install
```

### Using the generator

```bash
npm install -g generator-botlerplate
yo botlerplate
```
If you use the generator, see the [documentation](https://github.com/RecastAI/generator-botlerplate)


## Example

To have a running example of botlerplate, you just need to use the first bot you had when you created your account on Recast, `your-slack-bot`.

```bash
git clone https://github.com/RecastAI/botlerplate.git mybot
cd mybot
npm install
TOKEN=YOUR_RECAST_TOKEN npm run emulator -- --db
```

For detailed information about how the framework works, see the [wiki](https://github.com/RecastAI/botlerplate/wiki)

## Author

François Triquet - Recast.AI francois.triquet@recast.ai

You can follow us on Twitter at @recastai for updates and releases.

