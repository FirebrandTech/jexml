[![Tests](https://github.com/FirebrandTech/jexml/actions/workflows/tests.yml/badge.svg)](https://github.com/FirebrandTech/jexml/actions/workflows/tests.yml)

# Jexml

Create XML output from JSON data using YAML templates.

## Installation

```bash
npm i @firebrandtech/jexml
# or
yarn add @firebrandtech/jexml
```

---

## Usage

```typescript
import { Jexml } from '@firebrandtech/jexml';
import { readFileSync } from 'fs';

// OPTION 1) create a new Jexml instance with template string
const yamlTemplate = readFileSync(pathToTemplate, 'utf8');
const jexml = new Jexml({ templateString: 'YAML TEMPLATE STRING' });

// OPTION 2) specify path to Jexml should read the template from
const pathToTemplate = 'path/to/template.yaml';
const jexml = new Jexml({ templatePath: pathToTemplate });

// Convert JSON data to XML
jexml.convert(/* JSON data */);
```

## Streams

Jexml supports streaming data to the XML output. The `stream` method
returns a `Transform` stream that can be piped to a `Writable` stream.

```typescript
import { Jexml } from '@firebrandtech/jexml';
import { createReadStream, createWriteStream } from 'fs';

const jexml = new Jexml({ templatePath: 'path/to/template.yaml' });

const readStream = createReadStream('path/to/data.json');
const writeStream = createWriteStream('path/to/output.xml');

readStream
  .pipe(
    jexml.stream({
      documentOpen: '<People>', // or array: ['<?xml version="1.0" encoding="UTF-8" ?>', '<People>']
      documentClose: '</People>', // or array: ['</People>']
    })
  )
  .pipe(writeStream);
```

---

# Template Syntax

**[Sample YAML Template](./tests/fixtures/sample.yml)**

Templates are written to use and support the syntax of the
[Jexl](https://github.com/TomFrost/Jexl) library.

You can create a sample template using the following command
which will output the generated XML to the console:

```bash
yarn example
```

## Basic Structure

```yaml
# Define the root element of the XML output
root: DocumentRoot
# Define the elements of the XML output
elements:
  SomeElement: value_reference
```

## Variables

Assume the following data structure from JSON:

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "address": {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zip": "12345"
  }
}
```

Mapping variables to values is done using the following syntax:

```yaml
root: Person
elements:
  FirstName: first_name
  LastName: last_name
  Address:
    Street: address.street
    City: address.city
    State: address.state
    Zip: address.zip
```

The output of the above YAML template will be:

```xml
<Person>
  <FirstName>John</FirstName>
  <LastName>Doe</LastName>
  <Address>
    <Street>123 Main St</Street>
    <City>Anytown</City>
    <State>CA</State>
    <Zip>12345</Zip>
  </Address>
</Person>
```

Additionally, static values can be assigned to elements by using the following syntax:

```yaml
elements:
  SomeElement: value(Some static value) # <SomeElement>Some static value</SomeElement>
```

## Atrributes

To define attributes of an element, use the following syntax:

```yaml
elements:
  ContactInformaiton:
    value: preferred_contact_value
    attributes:
      type: preferred_contact_type
```

The output of the aboved YAML template will be:

```xml
<ContactInformation type="email">jsmith@email.com</ContactInformation>
```

## Conditional Elements

Jexml supports standard conditional logic using the Jexl syntax inline for elements, for example:

```yaml
elements:
  IsAdmin: type === 'admin' # Boolean
  Role: type === 'admin' ? 'Administrator' : 'User' # Ternary
```

The output of the above Jexml template will be:

```xml
<IsAdmin>true</IsAdmin>
<Role>Administrator</Role>
```

To define conditional elements structures, use the following syntax, specifying the condition key with a Jexl expression and the elements key with the child elements:

```yaml
elements:
  Permissions:
    condition: type === 'admin' # Jexl condition syntax
    elements:
      ReadAccess: true
      WriteAccess: true
```

The output of the above template will be:

```xml
<Permissions>
  <ReadAccess>true</ReadAccess>
  <WriteAccess>true</WriteAccess>
</Permissions>
```

## Arrays

Jexml supports all Jexl array functions and methods for defining arrays of elements.

```yaml
FavoriteColor: colors[0] # Probably their favorite since it's first
```

Additionally, array output can be defined using the suffix `[]` for the key along with `elements` key with the `as` and `from` keys to define the array element name and the array reference, respectively.

Given the following JSON data:

```json
{
  "friends": [
    {
      "first_name": "John",
      "last_name": "Doe"
    },
    {
      "first_name": "Jane",
      "last_name": "Smith"
    }
  ]
}
```

To define an array of elements, use the following syntax:

```yaml
Friends[]:
  as: Friend
  from: friends
  elements:
    FirstName: first_name
    LastName: last_name
```

The output of the above template will be:

```xml
<Friends>
  <Friend>
    <FirstName>John</FirstName>
    <LastName>Doe</LastName>
  </Friend>
  <Friend>
    <FirstName>Jane</FirstName>
    <LastName>Smith</LastName>
  </Friend>
</Friends>
```

To omit the encapsulating `<Friends>` element, use the following `$[]` syntax:

```yaml
$[]:
  from: friends
  elements:
    FirstName: first_name
    LastName: last_name
```

The output of the above template will be:

```xml
<Friend>
  <FirstName>John</FirstName>
  <LastName>Doe</LastName>
</Friend>
<Friend>
  <FirstName>Jane</FirstName>
  <LastName>Smith</LastName>
</Friend>
```

## Repeating Elements

To define repeating elements, use the yaml array syntax, then specify elements
of the array with standard methods supported by Jexml

```yaml
AddressPart:
  - address.street # Referenced value
  - value: address.state # Inline value
    attributes:
      city: address.city # Inline attribute
  - elements:
      Zip: address.zip # Nested element
  - "address.zip == '55555' ? 'Somecity' : 'Unknown'" # Inline conditional element
  - condition: address.zip === '55555' # Conditional elements nested
    elements:
      Is55555Zip: value(true)
```

The output of the above template will be:

```xml
<AddressPart>123 Main St</AddressPart>
<AddressPart city="Anytown">CA</AddressPart>
<AddressPart>
  <Zip>55555</Zip>
</AddressPart>
<AddressPart>Unknown</AddressPart>
<AddressPart>
  <Is55555Zip>true</Is55555Zip>
</AddressPart>
```

## Imports and Extending Templates

Jexml supports importing and extending templates using the `$import` key. For example you can instantiate a Jexml instance with a template that imports another template:

```typescript
const jexml = new Jexml({
  templatePath: 'path/to/template.yaml',
  imports: {
    fooImport: {
      templatePath: 'path/to/foo.yaml',
      // ...or...
      templateString: 'YAML TEMPLATE STRING',
    },
  },
});
```

Then in your template you can import the `foo` template using the following syntax:

```yaml
$import.foo: fooImport
```

If you have multiple imports on the same level you will need to have unique key names so you can use the `$import` key with a `.` followed by a string to create unique keys to import multiple templates:

```yaml
$import.foo: fooImport
$import.bar: barImport
```

This will then merge the `fooImport` template into the current template.

## Custom Functions

Custom functions can be defined and used in the template by passing them to the Jexml instance:

```typescript
const jexml = new Jexml({
  templateString: config,
  functions: {
    concat: (...args) => args.join(''),
  },
});
```

Converting with the following template:

```yaml
elements:
  FullName: concat(first_name, ' ', last_name)
```

Would output `<FullName>John Doe</FullName>`.

## Custom Transforms

Custom transforms can be defined and used in the template by passing them to the Jexml instance:

```typescript
const jexml = new Jexml({
  templateString: config,
  transforms: {
    uppercase: (value) => value.toUpperCase(),
  },
});
```

Converting with the following template:

```yaml
elements:
  FirstName: first_name|uppercase
```

Would output `<FirstName>JOHN</FirstName>`.

## Custom Binary Operators

Custom binary operators can be defined and used in the template by passing them to the Jexml instance:

```typescript
const jexml = new Jexml({
  templateString: config,
  binaryOperators: {
    add: {
      precedence: 1,
      fn: (left, right) => left + right,
    },
  },
});
```

Converting with the following template:

```yaml
elements:
  Total: 1 add 2
```

Would output `<Total>3</Total>`.

---

# Development

## Install Dependencies

```bash
yarn
```

## Run Tests

```bash
yarn test
# or
yarn test:watch
```

## Build

```bash
yarn build
yarn build:types
```
