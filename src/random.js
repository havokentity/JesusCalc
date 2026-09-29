// Random full names for the "how rare is this?" tests.
const FIRST = ['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda','William','Elizabeth','David','Susan','Richard','Jessica','Joseph','Sarah','Thomas','Karen','Charles','Nancy','Daniel','Lisa','Matthew','Betty','Anthony','Sandra','Mark','Ashley','Paul','Emily','Steven','Donna','Andrew','Michelle','Kenneth','Carol','George','Amanda','Rajesh','Priya','Amit','Sunita','Vikram','Anjali','Suresh','Deepa','Arjun','Kavita','Ravi','Neha','Anil','Pooja','Sanjay','Meera','Carlos','Maria','Jose','Ana','Luis','Sofia','Juan','Lucia','Pedro','Elena','Ahmed','Fatima','Omar','Aisha','Hassan','Leila','Wei','Mei','Hiroshi','Yuki','Kwame','Amara','Ivan','Olga','Pierre','Claire','Hans','Greta','Liam','Noah','Oliver','Emma','Ava','Isabella','Lucas','Mateo','Francis','Clara','Vincent','Rosa','Anthony','Teresa','Dominic','Agnes'];
const LAST = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Sharma','Patel','Singh','Kumar','Gupta','Reddy','Nair','Iyer','Menon','Rao','Dsouza','Dsilva','Fernandes','Pereira','Rodrigues','Pinto','Dcosta','Lobo','Mendonca','Almeida','Khan','Ali','Hussain','Chen','Wang','Li','Zhang','Tanaka','Sato','Kim','Park','Mensah','Okafor','Ivanov','Petrov','Dubois','Laurent','Muller','Schmidt','Rossi','Russo','Silva','Santos','Oliveira','Costa','Murphy','Kelly','OBrien','Walsh','Novak','Kowalski','Nowak','Jensen','Hansen','Larsen','Cohen','Levi','Friedman','Katz'];
const pick = a => a[Math.random() * a.length | 0];
export function randomName(words){
  const parts = [];
  for (let i = 0; i < words - 1; i++) parts.push(pick(FIRST));
  parts.push(pick(LAST));
  return parts.join(' ');
}
