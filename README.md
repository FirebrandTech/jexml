# JeXML

Create XML output from JSON data using YAML templates.

## Installation

```bash
npm i @firebrandtech/jexml
# or
yarn add @firebrandtech/jexml
```

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

## Template Syntax

**[Sample YAML Template](./tests/fixtures/sample.yml)**

Templates are written to use and support the syntax of the
[Jexl](https://github.com/TomFrost/Jexl) library.

You can create a sample template using the following command
which will output the generated XML to the console:

```bash
yarn example
```

### Basic Structure

```yaml
# Define the root element of the XML output
root: DocumentRoot
# Define the elements of the XML output
elements:
  SomeElement: value_reference
```

### Variables

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

### Atrributes

To define attributes of an element, use the following syntax:

```yaml
elements:
  # Define an element with an attribute by specifying the
  # value and attributes keys
  ContactInformaiton:
    value: preferred_contact_value
    attributes:
      type: preferred_contact_type
```

The output of the aboved YAML template will be:

```xml
<ContactInformation type="email">jsmith@email.com</ContactInformation>
```

### Arrays

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

The output of the above YAML template will be:

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

## Development

### Install Dependencies

```bash
yarn
```

### Run Tests

```bash
yarn test
# or
yarn test:watch
```

### Build

```bash
yarn build
```
