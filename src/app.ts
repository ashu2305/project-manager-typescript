interface Drag {
    dragStart(e: DragEvent): void;
    dragEnd(e: DragEvent): void;
}

interface Target{
    dragOver(e: DragEvent): void;
    drop(e: DragEvent): void;
    dragLeave(e: DragEvent): void;
}

//----------//----------------//--------//
enum ProjectStatus {Active, Finished}

class Project {
    constructor(
        public id:string,
        public title: string,
        public desc: string,
        public people: number,
        public status: ProjectStatus
    ){}

}


type Listener<T> = (item: T[]) => void;


class State<T>{
    protected listener : Listener<T>[] = []; 

    addListener(listenFn: Listener<T> ) {
        this.listener.push(listenFn);
    }
}
///-----------//
class ProjectState extends State<Project> { 
    
    private static instance: ProjectState;
    private projects: Project[]=[];

    private constructor(){
        super();
    }

    static getInstance(){
        if(this.instance){
            return this.instance;
        }
        this.instance = new ProjectState();
        return this.instance;
    }
    addProject(title:string, desc: string, people:number){
        const newProject = new Project(
            Math.random().toString(),
            title,
            desc,
            people,
            ProjectStatus.Active
        )
        this.projects.push(newProject);
        this.updateListener();
    }
    moveProject(projectId: string, newStatus: ProjectStatus){
        const project = this.projects.find(item => item.id === projectId);
        if(project){
            project.status = newStatus;
            this.updateListener(); 
        }
    }
     private updateListener(){
        for(const listenFn of this.listener){
            listenFn(this.projects.slice());
        }
    }
}

const prjState =  ProjectState.getInstance(); 

//-------------//
interface Validator{ 
    required?: boolean;
    value: string| number;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
}

function validate (validateInput: Validator ){
    let isValid =  true;
    if(validateInput.required){
        isValid = isValid && validateInput.value.toString().trim().length !==0;
    }
    if(validateInput.minLength  != null&& typeof validateInput.value === "string" ){
        isValid = isValid && validateInput.value.length >= validateInput.minLength; 
    }
    if(validateInput.maxLength  != null&& typeof validateInput.value === "string" ){
        isValid = isValid && validateInput.value.length <= validateInput.maxLength; 
    }
    if(validateInput.min != null&& typeof validateInput.value === "number" ){
        isValid = isValid && validateInput.value >= validateInput.min; 
    }
    if(validateInput.max != null && typeof validateInput.value === "number" ){
        isValid = isValid && validateInput.value <= validateInput.max; 
    }
    return isValid;
}


//------- --------//
function Autobind (target:any, methodName:string, descriptor: PropertyDescriptor){
    const orgMethod = descriptor.value;
    const adjDescriptor:PropertyDescriptor = {
        configurable: true,
        get(){
            const boundFn = orgMethod.bind(this);
            return boundFn;
        }
    }
    return adjDescriptor;
}

abstract class  Component<T extends HTMLElement,U extends HTMLElement>{
    templateElement :  HTMLTemplateElement;
    hostElement: T;
    element: U;

    constructor(templateId: string, hostId: string , insertAtStart: boolean, newElementId?: string){
        this.templateElement = document.getElementById(templateId)! as HTMLTemplateElement;
        this.hostElement = document.getElementById(hostId)! as T;
        const importedNode = document.importNode(this.templateElement.content, true);
        this.element = importedNode.firstElementChild as U;
        if (newElementId) {
            this.element.id = newElementId;
          }
        this.attach(insertAtStart);
    }


    abstract renderContent(): void;
    abstract configure() : void;

    private attach(insertAtStart: boolean){
        this.hostElement.insertAdjacentElement( insertAtStart ? "afterbegin": "beforeend" ,this.element);
    }

}


class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> implements Drag {
    project: Project;
    constructor(hostId: string, project: Project){
        super("single-project", hostId, false, project.id);
        this.project = project;
        this.configure();
        this.renderContent();
    }
    @Autobind
    dragStart(event:DragEvent){
         event.dataTransfer!.setData('text/plain', this.project.id);
         event.dataTransfer!.effectAllowed = "move";
    }

    dragEnd(event:DragEvent){
        console.log('DragEnd');
    }

    configure(){
        this.element.addEventListener("dragstart", this.dragStart);
        this.element.addEventListener("dragend", this.dragEnd);
    }

    renderContent(){
        this.element.querySelector("h2")!.textContent = this.project.title;
        this.element.querySelector("h3")!.textContent = `No of people - ${this.project.people.toString()}`;
        this.element.querySelector("p")!.textContent = this.project.desc;
    }
    
}
 

//-----------//
class ProjectList extends Component<HTMLDivElement, HTMLElement> implements Target {
    listProject: Project[];

    constructor(private type: "active"| "finished"){
        super("project-list", "app", false, `${type}-projects`);
        this.listProject = [];
        
        
        this.configure();
        this.renderContent();
    }
    @Autobind
    dragOver(event: DragEvent){
        if(event.dataTransfer && event.dataTransfer.types[0] === "text/plain"){
            event.preventDefault();
            const listEle = this.element.querySelector("ul")!;
            listEle.classList.add("droppable");
        }
    }
    @Autobind
    drop(event: DragEvent){
        const prjId = event.dataTransfer!.getData("text/plain");
        prjState.moveProject(prjId, this.type === "active" ? ProjectStatus.Active : ProjectStatus.Finished)  
    }

    @Autobind
    dragLeave(event: DragEvent){
        const listEle = this.element.querySelector("ul")!;
        listEle.classList.remove("droppable");
    }


    configure(){
        this.element.addEventListener("dragover", this.dragOver);
        this.element.addEventListener("dragleave", this.dragLeave);
        this.element.addEventListener("drop", this.drop);

        prjState.addListener((projects: Project[]) =>{
            const filterProject = projects.filter(project => {
                if(this.type === 'active'){
                    return project.status === ProjectStatus.Active;
                }
                return project.status === ProjectStatus.Finished;
            })
            this.listProject = filterProject;
            this.renderProject();
        })
    }
    private renderProject(){
        const listEle = document.getElementById(`${this.type}-projects-list`)! as HTMLUListElement;
        listEle.innerHTML = "";
        for(const prj of this.listProject){
            new ProjectItem(this.element.querySelector("ul")!.id   , prj);



            // const listItem = document.createElement("li");
            // listItem.textContent = prj.title;
            // listEle.appendChild(listItem);
        }
    }

    renderContent(){
        const listId = `${this.type}-projects-list`;
        this.element.querySelector("ul")!.id = listId;
        this.element.querySelector('h2')!.textContent = this.type.toUpperCase()+ "    PROJECTS";

    }

    
}

//------//
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
    
    titleInputElement: HTMLInputElement;
    descInputElement: HTMLInputElement;
    nameInputElement: HTMLInputElement;
    
    constructor(){
        super( "project-input" ,"app", true);

        this.titleInputElement = this.element.querySelector("#title")! as HTMLInputElement;
        this.descInputElement = this.element.querySelector("#description")! as HTMLInputElement;
        this.nameInputElement = this.element.querySelector("#people")! as HTMLInputElement;
        
        this.configure();
    }
    renderContent(){}
    
    private getUser(): [string, string, number]|void{
        const title = this.titleInputElement.value;
        const desc = this.descInputElement.value;
        const people = this.nameInputElement.value;

        const titleValidate: Validator = {
            value: title,
            required: true,
        }
        const descValidate: Validator = {
            value: desc,
            required: true,
            minLength: 5
        }
        const peopleValidate: Validator = {
            value:  +people,
            required: true,
            min: 2,
            max: 8
        }

        if( !validate(titleValidate) || !validate(descValidate ) || !validate(peopleValidate) ){
            alert("enter again");
            return;
        }else{
            return [title, desc, +people];
            
        }
    }

    private clearInput(){
        this.titleInputElement.value= '';
        this.descInputElement.value= '';
        this.nameInputElement.value= '';

    }
    @Autobind
    private submitHandler(e: Event){
        e.preventDefault();
        const user = this.getUser();
        if(Array.isArray(user)){
            const [title, desc, people] = user;
            prjState.addProject(title, desc, people);
            this.clearInput();
        }
        
    }
    configure(){
        this.element.addEventListener("submit", this.submitHandler)
    }
}

const prjInput = new ProjectInput();

const activeProject = new ProjectList("active");
const finishedProject = new ProjectList("finished");


