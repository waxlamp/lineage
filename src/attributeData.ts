import {ITable, asTable} from 'phovea_core/src/table';
import {IAnyVector} from 'phovea_core/src/vector';
import {list as listData, getFirstByName, get as getById} from 'phovea_core/src/data';
import {tsv} from 'd3-request';
import {ICategoricalVector, INumericalVector} from 'phovea_core/src/vector/IVector';
import {VALUE_TYPE_CATEGORICAL, VALUE_TYPE_INT} from 'phovea_core/src/datatype';
import * as events from 'phovea_core/src/event';

export default class AttributeData {

  table:ITable;
  public columns = []; // This holds headers as object {name,type}
  public activeAttributes = [] ; // active attribute is an attribute that is not ID. This an array of strings (column name)


  constructor(datasetName) {
    // load data into public variable table, after loading we can call different function that access data

    this.loadData(datasetName).then(()=> {
        this.parseData();
      })
      .catch(function (error) {
        console.log('Error: ' + error);
      })

    console.log("END OF CONSTRUCTOR")
    console.log(this.columns);

    this.attachListener();

  }


  /**
   * This function load genealogy data from lineage-server
   * and store it in the public table variable
   * @param: name of the dataset
   * returns a promise of table
   *
   */
  public async loadData(name:string) {
    //retrieving the desired dataset by name
    this.table = <ITable> await getFirstByName(name);
    return this.table;
  }

  /**
   * This function is called after loadData.
   * This function populate needed variables for attribute table and attribute panel
   *
   */
  public parseData() {

      //return new Promise((resolve, reject) => {

        // all_columns hold columns as TableVector
        // we want to populate the public variable columns
        const  allColumns = this.table.cols();

        allColumns.forEach((col) => {
          console.log('COLUMN ++++++++');
          console.log(col);
          const name = col.desc.name;
          const type = col.desc.value.type;

          //adding a column object that has :
          // column name, type
          this.columns.push({
            name: name,
            type: type
          })

          // if the type of the column is ID then it is not in the active list
          if(!(type === 'idType')) {
            this.activeAttributes.push(name);
          }
        });
        //resolve();
      //});
  }

  private attachListener() {

    //Set listener for added attribute to the active list
    events.on('attribute_added', (evt, item) => {

    });

    //Set listener for removed attribute from the active list
    events.on('attribute_reordered', (evt, item) => {

    });
    //Set listener for reordering attribute within the active list
    events.on('attribute_removed', (evt, item) => {

    });
  }


}


/**
 * Method to create a new AttributeData instance

 * @returns {AttributeData}
 */
export function create(datasetName) {

  return new AttributeData(datasetName);
}