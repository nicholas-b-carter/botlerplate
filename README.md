# Recast.Ai Botlerplate

Botlerplate is a chatbot framework built to work with Recast.Ai's API.

## Synopsis

Thie module allows you to start your project with strong bases.

## Installation

### Manual install

```bash
git clone https://github.com/RecastAI/botlerplate
```

### Using the generator

```bash
npm install -g generator-botlerplate
yo botlerplate
```
If you use the generator, see the [documentation](https://github.com/RecastAI/generator-botlerplate)


For detailed information about how the framework works, see the [wiki](https://github.com/RecastAI/botlerplate/wiki)

## Example

To have a running example of botlerplate, fork [this bot](https://recast.ai/ftriquet/meeting-room-bot) on Recast and follow these commands.

```bash
git clone https://github.com/RecastAI/botlerplate.git mybot
cd mybot
cp example/actions/* src/actions
TOKEN=YOUR_RECAST_TOKEN npm run emulator -- --db
```
