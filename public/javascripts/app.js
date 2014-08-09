$(document).ready(function() {

  var self = this;

  self.names = {
    mainContentId: 'main-content',
    newTaskInputId: 'new-task-input',

    taskViewTemplateId: 'task-view-template',
    taskListViewTemplateId: 'task-list-view-template',
    projectListViewTemplateId: 'project-list-view-template',

    taskViewClass: 'task-view',
    taskListViewClass: 'task-list-view',
    projectListViewId: 'project-list-view',

    urgentImportantListId: 'urgent-important-list',
    urgentNotImportantListId: 'urgent-not-important-list',
    notUrgentImportantListId: 'not-urgent-important-list',
    notUrgentNotImportantListId: 'not-urgent-not-important-list',

    draggedElementClass: 'currently-dragged-element',
  }


  //=======================================================================
  // Models
  //=======================================================================

  self.Task = Backbone.Model.extend({
    defaults: {
      name: '',
      selected: false,
    },
  });

  self.Project = Backbone.Model.extend({
    defaults: {
      name: ''
    },
  });


  //=======================================================================
  // Colllections
  //=======================================================================

  self.TaskCollection = Backbone.Collection.extend({
    model: self.Task,
  });

  self.ProjectList = Backbone.Collection.extend({
    model: self.Project,
  });


  //=======================================================================
  // Views
  //=======================================================================

  self.TaskView = Backbone.View.extend({
    tagName: 'div',
    className: self.names.taskViewClass,
    events: {
      'drop': 'drop',
    },
    drop: function(e, index) {
      // TODO
    },
    template: function(data) {
      return _.template($('#' + self.names.taskViewTemplateId)
                        .html(), data.toJSON());
    },
    render: function() {
      this.$el.html(this.template(this.model));
      return this.$el.html();
    },
  });

  self.TaskListView = Backbone.View.extend({
    tagName: 'div',
    className: self.names.taskListViewClass,
    initialize: function(options) {
      this.name = options['name'];

      // Events
      this.listenTo(this.model, 'add', this.render);
    },
    template: function(data) {
      return _.template($('#' + self.names.taskListViewTemplateId)
                        .html(), data);
    },
    render: function() {
      var html = '';
      this.model.each(function(task) {
        html += new self.TaskView({model: task}).render();
      });
      this.$el.html(html);


      // Append the the right container.
      var id = '';
      if (this.name == 'urgent + important') {
        id = self.names.urgentImportantListId;
      } else if (this.name == 'urgent + not important') {
        id = self.names.urgentNotImportantViewId;
      } else if (this.name == 'not urgent + important') {
        id = self.names.notUrgentImportantViewId;
      } else if (this.name == 'not urgent + not important') {
        id = self.names.notUrgentNotImportantListId;
      }
      var container = $('#' + id);
      container.empty();
      container.append(this.$el.html());

      return this.el;
    },
    addTaskAtIndex: function(task, index) {

    },
  });

  self.ProjectListView = Backbone.View.extend({
    tagName: 'div',
    id: self.names.projectListViewId,
    template: function() {
      return _.template($('#' + self.names.projectListViewTemplateId)
                        .html(), data);
    },
    render: function() {
      this.$el.html(this.template(this.model.attributes));
    },
  });

  //=======================================================================
  // App
  //=======================================================================

  self.App = function() {
    var that = this;
    that.currentView = null;
    that.dropTargetTaskList = null;

    that.start = function() {
      // Initialize the project list view.
      that.projectListView = new self.ProjectListView({});

      var testTastList = new self.TaskCollection([
        new self.Task({
          name: 'Test task',
          selected: false,
        }),
        new self.Task({
          name: 'Another test task',
          selected: true,
        }),
        new self.Task({
          name: 'Another test taks with a very long name',
          selected: true,
        }),
      ]);

      // Initialize the task list views.

      // `urgent + important'
      that.urgentImportantView = new self.TaskListView({
        model: testTastList,
        name: 'urgent + important',
      });
      that.urgentImportantView.render();
      // `urgent + not important'
      that.urgentNotImportantView = new self.TaskListView({
        name: 'urgent + not important',
        model: new self.TaskCollection([]),
      });
      that.urgentNotImportantView.render();
      // `not urgent + important'
      that.notUrgentImportantView = new self.TaskListView({
        name: 'not urgent + important',
        model: new self.TaskCollection([]),
      });
      // `not urgent + not important'
      that.notUrgentImportantView.render();
      that.notUrgentNotImportantView = new self.TaskListView({
        name: 'not urgent + not important',
        model: new self.TaskCollection([]),
      });
      that.notUrgentNotImportantView.render();

      // Make the indvidual lists easily referencable.
      that.taskLists = {};
      that.taskLists[self.names.urgentImportantListId] =
        that.urgentImportantView;
      that.taskLists[self.names.urgentNotImportantListId] =
        that.urgentNotImportantView;
      that.taskLists[self.names.notUrgentImportantListId] =
        that.notUrgentImportantView;
      that.taskLists[self.names.notUrgentNotImportantListId] =
        that.notUrgentNotImportantView;

      // Make the input field generate new models.
      $('#' + self.names.newTaskInputId).keypress(function(e) {
        if (e.which == 13) {
          e.preventDefault();
          var newModel = new self.Task({
            name: $(this).val(),
          });
          that.urgentImportantView.model.unshift(newModel);
          $(this).val('');
        }
      });
    };

    that.show = function(view) {
      if (that.currentView) {
        that.currentView.close();
      }

      that.currentView = view;
      that.currentView.render();

      $('#' + self.names.mainContentId).html(that.currentView.el);
    };
  };

  self.app = new self.App();
  self.app.start();


  //=======================================================================
  // Drag & Drop
  //=======================================================================

  $('.task-list').sortable({
    connectWith: '.task-list',
    start: function(e, ui) {
      ui.item.addClass(self.names.draggedElementClass);
      // console.log($(this).attr('id'));  // DEBUG
      var id = $(this).attr('id');
      // self.app.taskLists[id]
      console.log(self.app.taskLists[id].model);  // DEBUG
    },
    stop: function(e, ui) {
      ui.item.removeClass(self.names.draggedElementClass);
      // If the drop target is the source element itself:
      if (self.app.dropTargetTaskList == null) {

      } else {

      }
      // console.log(ui.item.index());  // DEBUG
      // console.log(ui.item);  // DEBUG
      // Reset the drop target.
      self.app.dropTargetTaskList = null;
    },
    receive: function(e, ui) {
      self.app.dropTargetTaskList = $(this).attr('id');
    },
  }).disableSelection();

});
