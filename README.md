# Recast.Ai Botlerplate

Botlerplate is a chatbot framework built to work with Recast.Ai's API.

## Synopsis

The boilerplate allows you to start your project with strong bases.

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


For detailed information about how the framework works, see the [wiki](https://github.com/RecastAI/botlerplate/wiki)

## Example

To have a running example of botlerplate, you just need to use the first you had when you created your account on Recast, your-slack-bot.

```bash
git clone https://github.com/RecastAI/botlerplate.git mybot
cd mybot
npm install
TOKEN=YOUR_RECAST_TOKEN npm run emulator -- --db
```
